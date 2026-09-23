window.ProviderUpsert = (function () {
  var PROTOCOL_OPTIONS = ['openai', 'anthropic', 'gemini'];
  var MODEL_LIST_TIP =
    '模型列表为必填项（至少 1 个元素）。「获取」将从上游拉取可用模型并回填到列表，未完成必要配置时按钮置灰。也可直接输入模型名称按回车添加，或点击「批量添加」粘贴多行/分隔的模型名（合并进现有列表，不覆盖）。';
  var MODEL_LIST_PLACEHOLDER =
    '点击「获取」拉取上游模型列表，输入模型名回车添加，或使用「批量添加」';
  var BATCH_MODAL_ID = 'modal-provider-batch-models';

  function helpIcon(tip) {
    return (
      '<span class="form-help-icon" title="' +
      IvuUI.escapeHtml(tip || '') +
      '">?</span>'
    );
  }

  function canDiscoverModels(data) {
    var protocols = data.model_protocols || [];
    if (!protocols.length) return false;
    return (data.instance_pool || []).some(function (inst) {
      return String(inst.addr || '').trim();
    });
  }

  function renderDiscoverButton(data) {
    var enabled = canDiscoverModels(data);
    return (
      '<button type="button" class="ivu-btn ' +
      (enabled ? 'ivu-btn-primary' : 'ivu-btn-default proto-btn-disabled') +
      '" id="provider-discover-models"' +
      (enabled ? '' : ' disabled') +
      '><span>获取</span></button>'
    );
  }

  function parseModelNames(text) {
    var seen = {};
    var result = [];
    String(text || '')
      .split(/[\s,，;；]+/)
      .forEach(function (item) {
        var name = item.trim();
        if (!name || seen[name]) return;
        seen[name] = true;
        result.push(name);
      });
    return result;
  }

  function mergeModels(data, names) {
    var incoming = Array.isArray(names) ? names : parseModelNames(names);
    var current = data.models || [];
    var existing = {};
    current.forEach(function (item) {
      existing[item] = true;
    });
    var added = [];
    incoming.forEach(function (name) {
      if (!existing[name]) {
        existing[name] = true;
        added.push(name);
      }
    });
    if (added.length) {
      data.models = current.concat(added);
    }
    return added.length;
  }

  function notifyModelsMerged(added) {
    if (added) {
      Prototype.toast('已添加 ' + added + ' 个模型', 'success');
    } else {
      Prototype.toast('没有新增模型', 'info');
    }
  }

  function ensureBatchModelsModal() {
    if (document.getElementById(BATCH_MODAL_ID)) return;
    var footer =
      IvuUI.btn(
        '取消',
        'default',
        '',
        '',
        'data-close-modal="' + BATCH_MODAL_ID + '"',
      ) +
      IvuUI.btn(
        '确定',
        'primary',
        '',
        '',
        'id="provider-batch-models-confirm"',
      );
    var body =
      '<textarea id="provider-batch-models-text" class="ivu-input" rows="8" placeholder="每行一个模型名，也可用逗号、中文逗号、分号或空白分隔"></textarea>';
    document.body.insertAdjacentHTML(
      'beforeend',
      IvuUI.modal(BATCH_MODAL_ID, '批量添加', body, footer, '520px'),
    );
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function validateProviderName(name) {
    if (!name) return false;
    if (name.length < 1 || name.length > 64) return false;
    return /^[A-Za-z0-9][A-Za-z0-9_.-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/.test(name);
  }

  function instancePoolKey(addr, port) {
    return String(addr || '').trim() + '|' + String(port);
  }

  /** 原型 mock：POST /providers/tools/discover-models */
  function mockDiscoverModels(payload) {
    var protocol = payload.model_protocol;
    if (protocol === 'anthropic') {
      return ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
    }
    if (protocol === 'gemini') {
      return ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    }
    if (payload.addr && String(payload.addr).indexOf('deepseek') !== -1) {
      return ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];
    }
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
  }

  function buildDiscoverPayload(data) {
    var protocols = data.model_protocols || [];
    var inst = (data.instance_pool || [])[0] || {};
    var addr = (inst.addr || '').trim();
    var port = Number(inst.port);
    var keys = (data.keys || []).filter(function (k) {
      return (k.key || '').trim();
    });
    var modelProtocol = protocols[0] || '';
    var defaultUri =
      modelProtocol === 'gemini' ? '/v1beta/models' : '/v1/models';
    return {
      model_protocol: modelProtocol,
      schema: (data.model_endpoint && data.model_endpoint.schema) || 'https',
      addr: addr,
      port: port,
      uri: (data.model_endpoint && data.model_endpoint.uri) || defaultUri,
      apikey: keys.length ? String(keys[0].key || '').trim() : '',
    };
  }

  function validateDiscoverPayload(payload) {
    if (!payload.model_protocol) return '请至少选择一个模型协议';
    if (PROTOCOL_OPTIONS.indexOf(payload.model_protocol) === -1) {
      return 'model_protocol 须为 openai、anthropic 或 gemini';
    }
    if (!payload.schema) return '请选择请求协议 schema';
    if (!payload.addr) return '请填写实例地址后再获取模型';
    if (
      !Number.isFinite(payload.port) ||
      payload.port < 1 ||
      payload.port > 65535
    ) {
      return '实例端口须为 1–65535';
    }
    var uri = payload.uri || '/v1/models';
    if (uri && uri.charAt(0) !== '/') return '模型接口 URI 必须以 / 开头';
    return null;
  }

  function maskSecretKey(key) {
    if (!key) return '';
    var s = String(key);
    if (s.length <= 8) return '****';
    return s.slice(0, 4) + '****' + s.slice(-4);
  }

  function createDefaultData(row) {
    row = row || {};
    return {
      name: row.name || '',
      description: row.description || '',
      model_endpoint: {
        schema: (row.model_endpoint && row.model_endpoint.schema) || 'https',
        uri: (row.model_endpoint && row.model_endpoint.uri) || '/v1/models',
      },
      models: (row.models || []).slice(),
      keys:
        row.keys && row.keys.length ? clone(row.keys) : [{ name: '', key: '' }],
      instance_pool:
        row.instance_pool && row.instance_pool.length
          ? clone(row.instance_pool)
          : [{ name: '', addr: '', weight: 100, port: 443 }],
      model_protocols: (row.model_protocols || ['openai']).slice(),
      protocol_paths: (function () {
        var src = row.protocol_paths || {};
        var out = {};
        Object.keys(src).forEach(function (k) { out[k] = src[k]; });
        return out;
      })(),
      time_zone: row.time_zone || 'Asia/Shanghai',
      tiers: clone(row.tiers || []),
      create_time: row.create_time || 0,
      update_time: row.update_time || 0,
    };
  }

  function isValidProtocolPath(path) {
    if (!path || typeof path !== 'string') return false;
    if (path.charAt(0) !== '/') return false;
    if (path.charAt(path.length - 1) === '/') return false;
    if (/[?$#]/.test(path)) return false;
    if (/\.\./.test(path)) return false;
    if (path.length > 128) return false;
    return true;
  }

  function renderProtocolSelect(data, isView) {
    var selected = data.model_protocols || [];
    var tags = selected.length
      ? selected
          .map(function (item) {
            return (
              '<span class="ivu-tag ivu-tag-primary ivu-tag-checked' +
              (isView ? '' : ' ivu-tag-closable') +
              ' proto-protocol-tag">' +
              '<span class="ivu-tag-text">' +
              IvuUI.escapeHtml(item) +
              '</span>' +
              (isView
                ? ''
                : '<i class="ivu-icon ivu-icon-ios-close proto-protocol-remove" data-value="' +
                  IvuUI.escapeHtml(item) +
                  '"></i>') +
              '</span>'
            );
          })
          .join('')
      : '<span class="ivu-select-placeholder">请选择模型协议（可多选）</span>';

    var options = PROTOCOL_OPTIONS.map(function (item) {
      var on = selected.indexOf(item) !== -1;
      return (
        '<li class="ivu-select-item proto-protocol-option' +
        (on ? ' ivu-select-item-selected' : '') +
        '" data-value="' +
        item +
        '">' +
        item +
        '</li>'
      );
    }).join('');

    return (
      '<div class="ivu-select ivu-select-multiple proto-protocol-select' +
      (isView ? ' ivu-select-disabled' : '') +
      '">' +
      '<div class="ivu-select-selection proto-protocol-toggle">' +
      tags +
      '<i class="ivu-icon ivu-icon-ios-arrow-down ivu-select-arrow"></i>' +
      '</div>' +
      '<div class="ivu-select-dropdown proto-protocol-dropdown" style="display:none;">' +
      '<ul class="ivu-select-dropdown-list">' +
      options +
      '</ul></div></div>'
    );
  }

  function looksLikeIPv4(addr) {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(addr || '');
  }

  function inferInstanceMode(pool) {
    if (!pool || pool.length !== 1) return 'ip';
    var inst = pool[0] || {};
    if (!(inst.addr || '').trim()) return 'ip';
    if (
      Number(inst.port) === 443 &&
      Number(inst.weight) === 100 &&
      !looksLikeIPv4(inst.addr)
    ) {
      return 'domain';
    }
    return 'ip';
  }

  function firstInstanceHost(data) {
    var inst = ((data && data.instance_pool) || [])[0] || {};
    var addr = (inst.addr || '').trim();
    if (!addr) return '实例地址:端口';
    return (
      addr + ':' + (inst.port != null && inst.port !== '' ? inst.port : 443)
    );
  }

  function renderInstancePool(data, isView, instanceMode) {
    var disabled = isView ? ' disabled="disabled"' : '';
    var mode = instanceMode === 'domain' ? 'domain' : 'ip';
    var modeSelect =
      '<select id="provider-instance-mode" class="ivu-input proto-instance-mode" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;"' +
      disabled +
      '>' +
      '<option value="ip"' +
      (mode === 'ip' ? ' selected' : '') +
      '>IP</option>' +
      '<option value="domain"' +
      (mode === 'domain' ? ' selected' : '') +
      '>服务商域名</option>' +
      '</select>';

    var bodyHtml = '';
    if (mode === 'domain') {
      var domain = ((data.instance_pool || [])[0] || {}).addr || '';
      bodyHtml = IvuUI.formTopItem(
        '服务商域名',
        '<input type="text" class="ivu-input proto-domain-addr" value="' +
          IvuUI.escapeHtml(domain) +
          '" placeholder="请输入服务商域名，例如 example.com"' +
          disabled +
          ' />',
      );
    } else {
      var canDelete = !isView && (data.instance_pool || []).length > 1;
      var instanceRows = (data.instance_pool || [])
        .map(function (item, index) {
          return (
            '<tr data-instance-index="' +
            index +
            '">' +
            '<td><input type="text" class="ivu-input proto-instance-addr" data-index="' +
            index +
            '" value="' +
            IvuUI.escapeHtml(item.addr || '') +
            '" placeholder="请输入IP地址"' +
            disabled +
            ' /></td>' +
            '<td style="width:110px;"><input type="number" class="ivu-input proto-instance-port" data-index="' +
            index +
            '" min="1" max="65535" value="' +
            (item.port != null ? item.port : 443) +
            '"' +
            disabled +
            ' /></td>' +
            '<td style="width:110px;"><input type="number" class="ivu-input proto-instance-weight" data-index="' +
            index +
            '" min="0" max="100" value="' +
            (item.weight != null ? item.weight : 100) +
            '"' +
            disabled +
            ' /></td>' +
            '<td style="width:80px;">' +
            (isView
              ? '-'
              : '<button type="button" class="ivu-btn ivu-btn-error ivu-btn-small" data-action="remove-instance" data-index="' +
                index +
                '"' +
                (canDelete ? '' : ' disabled="disabled"') +
                '><span>删除</span></button>') +
            '</td>' +
            '</tr>'
          );
        })
        .join('');
      bodyHtml =
        '<div class="ivu-form-item">' +
        '<label class="ivu-form-item-label" style="float:none;display:block;text-align:left;padding:0 0 8px;">实例IP列表</label>' +
        '<div class="ivu-form-item-content" style="margin-left:0!important;">' +
        '<table class="mapping-table">' +
        '<thead><tr>' +
        '<th>IP地址</th><th style="width:110px;">端口</th><th style="width:110px;">权重</th><th style="width:80px;">操作</th>' +
        '</tr></thead><tbody id="provider-instance-body">' +
        instanceRows +
        '</tbody></table>' +
        (isView
          ? ''
          : '<button type="button" class="ivu-btn ivu-btn-primary ivu-btn-small" id="provider-add-instance" style="margin-top:12px;"><span>+ 创建</span></button>' +
            '<p id="proto-instance-error" class="proto-instance-error" style="display:none;"></p>') +
        '</div></div>';
    }

    return (
      '<div class="llm-card"><div class="llm-card-title">实例池</div><div class="llm-card-body">' +
      IvuUI.formTop(
        IvuUI.formTopItem('实例形态', modeSelect, true) + bodyHtml,
      ) +
      '</div></div>'
    );
  }

  function renderEndpointUrlGroup(data, isView) {
    var disabled = isView ? ' disabled="disabled"' : '';
    var schema = (data.model_endpoint && data.model_endpoint.schema) || 'https';
    var uri = (data.model_endpoint && data.model_endpoint.uri) || '/v1/models';
    return (
      '<div class="endpoint-url-group">' +
      '<select class="endpoint-protocol proto-field" data-field="model_endpoint.schema"' +
      disabled +
      '>' +
      '<option value="https"' +
      (schema === 'https' ? ' selected' : '') +
      '>https://</option>' +
      '<option value="http"' +
      (schema === 'http' ? ' selected' : '') +
      '>http://</option>' +
      '</select>' +
      '<span class="endpoint-host">' +
      IvuUI.escapeHtml(firstInstanceHost(data)) +
      '</span>' +
      '<input type="text" class="ivu-input endpoint-uri proto-field" data-field="model_endpoint.uri" value="' +
      IvuUI.escapeHtml(uri) +
      '" placeholder="/v1/models"' +
      disabled +
      ' />' +
      '</div>'
    );
  }

  function formatTime(ts) {
    if (!ts) return '-';
    try {
      var date = new Date(Number(ts) * 1000);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('zh-CN');
    } catch (e) {
      return '-';
    }
  }

  function renderTags(list) {
    if (!list || !list.length) return '-';
    return list
      .map(function (item) {
        return IvuUI.tag(IvuUI.escapeHtml(item), 'primary');
      })
      .join(' ');
  }

  function renderDetailTable(headers, rowsHtml) {
    if (!rowsHtml) return '-';
    return (
      '<table class="mapping-table">' +
      '<thead><tr>' +
      headers
        .map(function (h) {
          return (
            '<th' +
            (h.width ? ' style="width:' + h.width + ';"' : '') +
            '>' +
            h.title +
            '</th>'
          );
        })
        .join('') +
      '</tr></thead><tbody>' +
      rowsHtml +
      '</tbody></table>'
    );
  }

  function renderPricingTiersDetail(data) {
    var timeZone = data.time_zone || 'Asia/Shanghai';
    var tiers = data.tiers || [];
    if (!tiers.length) {
      return IvuUI.card(
        '分段计价配置',
        '<div class="info-row"><div class="info-label">时区</div><div class="info-value">' +
          IvuUI.escapeHtml(timeZone) +
          '</div></div>' +
          '<div class="info-row"><div class="info-label">计价时段</div><div class="info-value">忙时（peak）</div></div>' +
          '<div class="info-row"><div class="info-label">时间段</div><div class="info-value">未配置</div></div>',
      );
    }

    return IvuUI.card(
      '分段计价配置',
      IvuUI.formTop(
        IvuUI.formTopItem('时区', IvuUI.escapeHtml(timeZone)) +
          IvuUI.formTopItem('计价时段', '忙时（peak）') +
          IvuUI.formTopItem(
            '时间段',
            renderDetailTable(
              [
                { title: '适用时段' },
                { title: '开始时间' },
                { title: '结束时间' },
              ],
              (
                (ProviderPricingTiers && ProviderPricingTiers.getPeakTier
                  ? ProviderPricingTiers.getPeakTier(data)
                  : tiers[0] || {}
                ).time_ranges || []
              )
                .map(function (tr) {
                  var weekdaysText = ProviderPricingTiers
                    ? ProviderPricingTiers.formatWeekdays(tr.weekdays)
                    : tr.weekdays && tr.weekdays.length
                    ? tr.weekdays.join(',')
                    : '每天';
                  return (
                    '<tr><td>' +
                    IvuUI.escapeHtml(weekdaysText) +
                    '</td><td>' +
                    IvuUI.escapeHtml(tr.start || '-') +
                    '</td><td>' +
                    IvuUI.escapeHtml(tr.end || '-') +
                    '</td></tr>'
                  );
                })
                .join('') || '-',
            ),
          ),
      ),
    );
  }

  function renderProtocolPaths(data, isView) {
    var paths = data.protocol_paths || {};
    var keys = Object.keys(paths);

    var helpTip =
      '按协议配置上游 API 基路径；BFE 转发时将命中的标准端点改写到该基路径（openai 兼容带/不带 /v1 的客户端入口）。未配置的协议请求路径原样转发；若清空所有映射，保存时将显式提交空对象以禁用路径改写。';

    function pathRow(proto, path) {
      var protoDisplay = isView
        ? IvuUI.escapeHtml(proto)
        : '<select class="ivu-input proto-path-proto-select" style="width:130px;height:32px;">' +
          PROTOCOL_OPTIONS.map(function (p) {
            return '<option value="' + IvuUI.escapeHtml(p) + '"' +
              (p === proto ? ' selected' : '') + '>' +
              IvuUI.escapeHtml(p) + '</option>';
          }).join('') +
          '</select>';
      var pathInput =
        '<input type="text" class="ivu-input proto-path-value" value="' +
        IvuUI.escapeHtml(path || '') +
        '" placeholder="例如 /v1"' +
        (isView ? ' disabled="disabled"' : '') +
        ' />';
      return (
        '<tr>' +
        '<td>' + protoDisplay + '</td>' +
        '<td>' + pathInput + '</td>' +
        (isView
          ? ''
          : '<td style="width:80px;"><button type="button" class="ivu-btn ivu-btn-error ivu-btn-small" data-action="remove-path"><span>删除</span></button></td>') +
        '</tr>'
      );
    }

    var headerActions = isView ? '' : '<th style="width:80px;">操作</th>';
    var bodyRows = keys.length
      ? keys
          .map(function (k) {
            return pathRow(k, paths[k]);
          })
          .join('')
      : '<tr class="proto-paths-empty-row"><td colspan="' +
        (isView ? 2 : 3) +
        '" style="text-align:center;color:#999;">未配置协议路径映射（保存后请求路径原样转发）</td></tr>';

    return (
      '<div class="llm-card"><div class="llm-card-title">' +
      '协议路径映射' +
      '<span class="form-help-icon" title="' +
      IvuUI.escapeHtml(helpTip) +
      '">?</span>' +
      '</div><div class="llm-card-body">' +
      '<table class="mapping-table">' +
      '<thead><tr><th style="width:140px;">协议</th><th>上游 API 基路径</th>' +
      headerActions +
      '</tr></thead><tbody id="proto-paths-body">' +
      bodyRows +
      '</tbody></table>' +
      (isView
        ? ''
        : '<button type="button" class="ivu-btn ivu-btn-primary ivu-btn-small" id="proto-add-path" style="margin-top:12px;"><span>+ 添加映射</span></button>') +
      '</div></div>'
    );
  }

  function renderDetail(data) {
    data = data || createDefaultData({});
    var mode = inferInstanceMode(data.instance_pool || []);
    var endpoint = data.model_endpoint || {};
    var endpointUrl =
      (endpoint.schema || 'https') +
      '://' +
      firstInstanceHost(data) +
      (endpoint.uri || '');

    var instanceBody = '';
    if (mode === 'domain') {
      var domain = ((data.instance_pool || [])[0] || {}).addr || '';
      instanceBody = IvuUI.formTop(
        IvuUI.formTopItem('实例形态', '服务商域名') +
          IvuUI.formTopItem('服务商域名', IvuUI.escapeHtml(domain || '-')),
      );
    } else {
      var instanceRows = (data.instance_pool || [])
        .map(function (item) {
          return (
            '<tr><td>' +
            IvuUI.escapeHtml(item.addr || '-') +
            '</td><td>' +
            IvuUI.escapeHtml(item.port != null ? item.port : '-') +
            '</td><td>' +
            IvuUI.escapeHtml(item.weight != null ? item.weight : '-') +
            '</td></tr>'
          );
        })
        .join('');
      instanceBody =
        IvuUI.formTop(IvuUI.formTopItem('实例形态', 'IP')) +
        renderDetailTable(
          [
            { title: 'IP地址' },
            { title: '端口', width: '110px' },
            { title: '权重', width: '110px' },
          ],
          instanceRows,
        );
    }

    var keyRows = (data.keys || [])
      .filter(function (item) {
        return (item.name && item.name.trim()) || (item.key && item.key.trim());
      })
      .map(function (item) {
        return (
          '<tr><td>' +
          IvuUI.escapeHtml(item.name || '-') +
          '</td><td>' +
          IvuUI.escapeHtml(maskSecretKey(item.key || '') || '-') +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<div class="gateway-config provider-detail">' +
      IvuUI.card(
        '基本信息',
        IvuUI.formTop(
          IvuUI.formTopItem('名称', IvuUI.escapeHtml(data.name || '-')) +
            IvuUI.formTopItem(
              '描述',
              IvuUI.escapeHtml(data.description || '-'),
            ) +
            IvuUI.formTopItem('创建时间', formatTime(data.create_time)) +
            IvuUI.formTopItem(
              '更新时间',
              formatTime(data.update_time || data.create_time),
            ),
        ),
      ) +
      IvuUI.card('实例池', instanceBody) +
      IvuUI.card(
        '模型服务配置',
        IvuUI.formTop(
          IvuUI.formTopItem('模型协议', renderTags(data.model_protocols)) +
            IvuUI.formTopItem('模型列表接口', IvuUI.escapeHtml(endpointUrl)) +
            IvuUI.formTopItem('模型列表', renderTags(data.models)),
        ),
      ) +
      renderProtocolPaths(data, true) +
      IvuUI.card(
        '服务鉴权 Keys',
        renderDetailTable(
          [{ title: 'Key 名称' }, { title: 'Key 值' }],
          keyRows,
        ),
      ) +
      renderPricingTiersDetail(data) +
      '</div>'
    );
  }

  function renderForm(data, isAdd, isView, instanceMode) {
    var disabled = isView ? ' disabled="disabled"' : '';
    var nameDisabled = !isAdd || isView ? ' disabled="disabled"' : '';

    var protocolSelect = renderProtocolSelect(data, isView);

    var keyRows = (data.keys || [])
      .map(function (item, index) {
        var keyDisplay = isView
          ? maskSecretKey(item.key || '')
          : item.key || '';
        return (
          '<tr data-key-index="' +
          index +
          '">' +
          '<td><input type="text" class="ivu-input proto-key-name" data-index="' +
          index +
          '" value="' +
          IvuUI.escapeHtml(item.name || '') +
          '" placeholder="Key 名称"' +
          disabled +
          ' /></td>' +
          '<td><input type="text" class="ivu-input proto-key-value" data-index="' +
          index +
          '" value="' +
          IvuUI.escapeHtml(keyDisplay) +
          '" placeholder="Key 值" autocomplete="new-password"' +
          disabled +
          ' /></td>' +
          '<td style="width:80px;">' +
          (isView
            ? '-'
            : '<button type="button" class="ivu-btn ivu-btn-error ivu-btn-small" data-action="remove-key" data-index="' +
              index +
              '"><span>删除</span></button>') +
          '</td>' +
          '</tr>'
        );
      })
      .join('');

    var selectedModels = data.models || [];
    var modelTags = selectedModels.length
      ? selectedModels
          .map(function (m) {
            return (
              '<span class="ivu-tag ivu-tag-primary ivu-tag-checked ivu-tag-closable proto-model-tag" data-model="' +
              IvuUI.escapeHtml(m) +
              '">' +
              '<span class="ivu-tag-text">' +
              IvuUI.escapeHtml(m) +
              '</span>' +
              (isView
                ? ''
                : '<i class="ivu-icon ivu-icon-ios-close proto-model-remove" data-value="' +
                  IvuUI.escapeHtml(m) +
                  '"></i>') +
              '</span>'
            );
          })
          .join('')
      : '';

    function renderModelListField() {
      var inputHtml = isView
        ? ''
        : '<input type="text" class="proto-model-input" placeholder="' +
          MODEL_LIST_PLACEHOLDER +
          '" />';
      var placeholderHtml =
        !isView && !selectedModels.length
          ? ''
          : '<span class="proto-placeholder" style="display:none;">' +
            MODEL_LIST_PLACEHOLDER +
            '</span>';
      if (isView && !selectedModels.length) {
        placeholderHtml =
          '<span class="proto-placeholder">' +
          MODEL_LIST_PLACEHOLDER +
          '</span>';
      }
      return IvuUI.formTopItem(
        '模型列表' + helpIcon(MODEL_LIST_TIP),
        '<div class="proto-model-select-wrap" style="display:flex;align-items:flex-start;gap:10px;">' +
          '<div class="proto-model-select" id="proto-provider-models" style="flex:1;min-height:32px;">' +
          '<div class="proto-model-select-tags">' +
          modelTags +
          inputHtml +
          placeholderHtml +
          '</div></div>' +
          (isView
            ? ''
            : '<span style="display:flex;gap:8px;flex-shrink:0;">' +
              '<button type="button" class="ivu-btn ivu-btn-default" id="provider-batch-add-models"><span>批量添加</span></button>' +
              renderDiscoverButton(data) +
              '</span>') +
          '</div>',
        true,
      );
    }

    return (
      '<div class="gateway-config">' +
      '<div class="llm-card"><div class="llm-card-title">基本信息</div><div class="llm-card-body">' +
      IvuUI.formTop(
        IvuUI.formTopItem(
          '名称',
          '<input type="text" class="ivu-input proto-field" data-field="name" value="' +
            IvuUI.escapeHtml(data.name) +
            '" placeholder="deepseek"' +
            nameDisabled +
            ' />',
          true,
        ) +
          IvuUI.formTopItem(
            '描述',
            '<input type="text" class="ivu-input proto-field" data-field="description" value="' +
              IvuUI.escapeHtml(data.description) +
              '" placeholder="最多 256 个字符"' +
              disabled +
              ' />',
          ),
      ) +
      '</div></div>' +
      renderInstancePool(data, isView, instanceMode) +
      '<div class="llm-card"><div class="llm-card-title">模型服务配置</div><div class="llm-card-body">' +
      IvuUI.formTop(
        IvuUI.formTopItem('模型协议', protocolSelect, true) +
          IvuUI.formTopItem(
            '模型列表接口',
            renderEndpointUrlGroup(data, isView),
          ) +
          renderModelListField(),
      ) +
      '</div></div>' +
      renderProtocolPaths(data, isView) +
      '<div class="llm-card"><div class="llm-card-title">服务鉴权 Keys</div><div class="llm-card-body">' +
      '<table class="mapping-table">' +
      '<thead><tr>' +
      '<th>Key 名称</th><th>Key 值</th><th style="width:80px;">操作</th>' +
      '</tr></thead><tbody id="provider-keys-body">' +
      keyRows +
      '</tbody></table>' +
      (isView
        ? ''
        : '<button type="button" class="ivu-btn ivu-btn-primary ivu-btn-small" id="provider-add-key" style="margin-top:20px;"><span>+ 添加 Key</span></button>') +
      '</div></div>' +
      '</div>'
    );
  }

  function syncFromDom(root, data) {
    root.querySelectorAll('.proto-field').forEach(function (field) {
      var path = field.getAttribute('data-field');
      if (!path) return;
      if (path === 'name') data.name = field.value;
      else if (path === 'description') data.description = field.value;
      else if (path === 'model_endpoint.schema')
        data.model_endpoint.schema = field.value;
      else if (path === 'model_endpoint.uri')
        data.model_endpoint.uri = field.value;
    });

    data.model_protocols = [];
    root
      .querySelectorAll('.proto-protocol-option.ivu-select-item-selected')
      .forEach(function (item) {
        data.model_protocols.push(item.getAttribute('data-value'));
      });

    data.protocol_paths = {};
    root.querySelectorAll('#proto-paths-body tr').forEach(function (row) {
      if (row.classList.contains('proto-paths-empty-row')) return;
      var protoSel = row.querySelector('.proto-path-proto-select');
      var pathInp = row.querySelector('.proto-path-value');
      var proto = protoSel ? protoSel.value : '';
      var val = pathInp ? (pathInp.value || '').trim() : '';
      if (proto && val) data.protocol_paths[proto] = val;
    });

    data.instance_pool = [];
    var domainInput = root.querySelector('.proto-domain-addr');
    if (domainInput) {
      var domainAddr = (domainInput.value || '').trim();
      data.instance_pool.push({
        name: domainAddr,
        addr: domainAddr,
        port: 443,
        weight: 100,
      });
    } else {
      root.querySelectorAll('[data-instance-index]').forEach(function (row) {
        var addr =
          (row.querySelector('.proto-instance-addr') || {}).value || '';
        var trimmedAddr = addr.trim();
        data.instance_pool.push({
          name: trimmedAddr,
          addr: trimmedAddr,
          port: Number(
            (row.querySelector('.proto-instance-port') || {}).value || 443,
          ),
          weight: Number(
            (row.querySelector('.proto-instance-weight') || {}).value || 0,
          ),
        });
      });
    }

    data.keys = [];
    root.querySelectorAll('[data-key-index]').forEach(function (row) {
      data.keys.push({
        name: (row.querySelector('.proto-key-name') || {}).value || '',
        key: (row.querySelector('.proto-key-value') || {}).value || '',
      });
    });
  }

  function validate(data, isAdd, existingNames, instanceMode) {
    var name = (data.name || '').trim();
    if (!name) return '请输入 Provider 名称';
    if (!validateProviderName(name)) {
      return 'Provider 名称格式不正确：1-64 字符，字母或数字开头结尾，允许字母、数字、_、-、.';
    }
    if (isAdd && (existingNames || []).indexOf(name) !== -1) {
      return 'Provider 名称已存在';
    }
    if (data.description && data.description.length > 256) {
      return '描述不能超过 256 个字符';
    }
    if (data.description && /[\x00-\x1F\x7F]/.test(data.description)) {
      return '描述不能包含控制字符';
    }
    if (!data.model_protocols || !data.model_protocols.length) {
      return '请至少选择一个模型协议';
    }
    var protocolSet = {};
    for (var p = 0; p < data.model_protocols.length; p++) {
      var proto = data.model_protocols[p];
      if (PROTOCOL_OPTIONS.indexOf(proto) === -1) {
        return '模型协议取值须为 openai、anthropic 或 gemini';
      }
      if (protocolSet[proto]) return '模型协议不能重复';
      protocolSet[proto] = true;
    }
    var uri = (data.model_endpoint && data.model_endpoint.uri) || '';
    if (uri && uri.charAt(0) !== '/') return '模型接口 URI 必须以 / 开头';

    var paths = data.protocol_paths || {};
    var protoKeys = Object.keys(paths);
    for (var pi = 0; pi < protoKeys.length; pi++) {
      var pk = protoKeys[pi];
      if (protocolSet[pk]) {
        if (!isValidProtocolPath(paths[pk])) {
          return '协议 "' + pk + '" 的上游 API 基路径格式不正确，须以 / 开头，不以 / 结尾，不含 ?、$、#、..';
        }
      } else {
        return '协议 "' + pk + '" 未在模型协议中启用，请先在模型协议中选择';
      }
    }

    var models = data.models || [];
    if (!models.length) return '模型列表为必填项，请至少添加 1 个模型';
    var modelSet = {};
    for (var mi = 0; mi < models.length; mi++) {
      if (!models[mi] || String(models[mi]).trim() === '') return '模型名不能为空';
      if (modelSet[models[mi]]) return '模型名不能重复：' + models[mi];
      modelSet[models[mi]] = true;
    }

    var instances = data.instance_pool || [];
    if (!instances.length) return '实例池至少需要 1 个实例';
    var poolKeySet = {};
    var hasWeight = false;
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      var addr = (inst.addr || '').trim();
      if (!addr) {
        return instanceMode === 'domain'
          ? '请填写服务商域名'
          : '第 ' + (i + 1) + ' 个实例请填写 IP 或域名';
      }
      var port = Number(inst.port);
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        return '第 ' + (i + 1) + ' 个实例端口须为 1–65535';
      }
      var weight = Number(inst.weight);
      if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
        return '第 ' + (i + 1) + ' 个实例权重须为 0–100';
      }
      if (weight > 0) hasWeight = true;
      var poolKey = instancePoolKey(addr, port);
      if (poolKeySet[poolKey]) {
        return '实例 IP 和端口不能重复: "' + addr + ':' + port + '"';
      }
      poolKeySet[poolKey] = true;
    }
    if (!hasWeight) return '至少有一个实例权重大于 0';

    var keys = (data.keys || []).filter(function (k) {
      return (k.name && k.name.trim()) || (k.key && k.key.trim());
    });
    var keyNames = {};
    for (var j = 0; j < keys.length; j++) {
      var kn = (keys[j].name || '').trim();
      var kv = (keys[j].key || '').trim();
      if (!kn) return 'Key 名称必填';
      if (kn.length > 128) return 'Key 名称长度须为 1–128 字符';
      if (!kv) return 'Key 值必填';
      if (kv.length > 512) return 'Key 值长度须为 1–512 字符';
      if (keyNames[kn]) return 'Key 名称不能重复：' + kn;
      keyNames[kn] = true;
    }
    data.keys = keys;
    return null;
  }

  function mount(bodyEl, footerEl, options) {
    options = options || {};
    ensureBatchModelsModal();
    var state = {
      isAdd: options.isAdd !== false,
      isView: !!options.isView,
      data: createDefaultData(options.row),
      existingNames: options.existingNames || [],
      instanceMode: inferInstanceMode(
        (options.row && options.row.instance_pool) || [],
      ),
    };

    function render() {
      bodyEl.innerHTML = state.isView
        ? renderDetail(state.data)
        : renderForm(state.data, state.isAdd, state.isView, state.instanceMode);
      if (footerEl) {
        footerEl.innerHTML = state.isView
          ? IvuUI.btn(
              '关闭',
              'default',
              'small',
              '',
              'id="provider-upsert-cancel"',
            )
          : IvuUI.btn(
              '提交',
              'primary',
              'small',
              '',
              'id="provider-upsert-submit"',
            ) +
            ' ' +
            IvuUI.btn(
              '取消',
              'default',
              'small',
              '',
              'id="provider-upsert-cancel"',
            );
      }
      bindEvents();
    }

    function refreshProtocolSelect(keepOpen) {
      var wrap = bodyEl.querySelector('.proto-protocol-select');
      if (!wrap) return;
      wrap.outerHTML = renderProtocolSelect(state.data, state.isView);
      bindProtocolSelect(keepOpen);
    }

    function refreshDiscoverButton() {
      syncFromDom(bodyEl, state.data);
      var btn = bodyEl.querySelector('#provider-discover-models');
      if (!btn) return;
      var enabled = canDiscoverModels(state.data);
      btn.disabled = !enabled;
      if (enabled) {
        btn.classList.remove('ivu-btn-default', 'proto-btn-disabled');
        btn.classList.add('ivu-btn-primary');
      } else {
        btn.classList.remove('ivu-btn-primary');
        btn.classList.add('ivu-btn-default', 'proto-btn-disabled');
      }
    }

    function toggleProtocol(value, keepOpen) {
      var list = state.data.model_protocols || [];
      var idx = list.indexOf(value);
      if (idx === -1) list.push(value);
      else list.splice(idx, 1);
      state.data.model_protocols = list;
      refreshProtocolSelect(!!keepOpen);
      refreshDiscoverButton();
    }

    function bindProtocolSelect(keepOpen) {
      if (state.isView) return;
      var wrap = bodyEl.querySelector('.proto-protocol-select');
      if (!wrap) return;
      var dropdown = wrap.querySelector('.proto-protocol-dropdown');
      var toggle = wrap.querySelector('.proto-protocol-toggle');
      if (keepOpen && dropdown) dropdown.style.display = 'block';

      if (toggle) {
        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          if (e.target.closest('.proto-protocol-remove')) return;
          if (!dropdown) return;
          dropdown.style.display =
            dropdown.style.display === 'none' ? 'block' : 'none';
        });
      }

      wrap.querySelectorAll('.proto-protocol-option').forEach(function (item) {
        item.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleProtocol(item.getAttribute('data-value'), true);
        });
      });

      wrap.querySelectorAll('.proto-protocol-remove').forEach(function (icon) {
        icon.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleProtocol(icon.getAttribute('data-value'), false);
        });
      });
    }

    function bindEvents() {
      var cancelBtn =
        footerEl && footerEl.querySelector('#provider-upsert-cancel');
      if (cancelBtn && typeof options.onCancel === 'function') {
        cancelBtn.addEventListener('click', options.onCancel);
      }
      if (state.isView) return;

      bindProtocolSelect(false);
      var modeSelect = bodyEl.querySelector('#provider-instance-mode');
      if (modeSelect && !state.isView) {
        modeSelect.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          var nextMode = modeSelect.value === 'domain' ? 'domain' : 'ip';
          var first = (state.data.instance_pool || [])[0] || {
            addr: '',
            port: 443,
            weight: 100,
          };
          if (nextMode === 'domain') {
            state.data.instance_pool = [
              { name: '', addr: first.addr || '', port: 443, weight: 100 },
            ];
          } else if (!state.data.instance_pool.length) {
            state.data.instance_pool = [
              { name: '', addr: first.addr || '', port: 443, weight: 100 },
            ];
          }
          state.instanceMode = nextMode;
          render();
        });
      }
      var addInst = bodyEl.querySelector('#provider-add-instance');
      if (addInst) {
        addInst.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          state.data.instance_pool.push({
            name: '',
            addr: '',
            weight: 0,
            port: 443,
          });
          render();
        });
      }
      bodyEl
        .querySelectorAll('[data-action="remove-instance"]')
        .forEach(function (btn) {
          btn.addEventListener('click', function () {
            syncFromDom(bodyEl, state.data);
            if (state.data.instance_pool.length <= 1) {
              Prototype.toast('至少保留一个实例', 'error');
              return;
            }
            state.data.instance_pool.splice(
              parseInt(btn.getAttribute('data-index'), 10),
              1,
            );
            render();
          });
        });
      function isInstanceError(msg) {
        if (!msg) return false;
        return (
          msg.indexOf('实例') !== -1 ||
          msg.indexOf('IP') !== -1 ||
          msg.indexOf('端口') !== -1 ||
          msg.indexOf('权重') !== -1 ||
          msg.indexOf('域名') !== -1
        );
      }

      function syncInstanceError() {
        var errEl = bodyEl.querySelector('#proto-instance-error');
        if (!errEl || state.isView || state.instanceMode === 'domain') return;
        syncFromDom(bodyEl, state.data);
        var err = validate(
          state.data,
          state.isAdd,
          state.existingNames,
          state.instanceMode,
        );
        if (isInstanceError(err)) {
          errEl.textContent = err;
          errEl.style.display = 'block';
        } else {
          errEl.style.display = 'none';
        }
      }

      function refreshEndpointHost() {
        syncFromDom(bodyEl, state.data);
        var hostEl = bodyEl.querySelector('.endpoint-host');
        if (hostEl) hostEl.textContent = firstInstanceHost(state.data);
        refreshDiscoverButton();
        syncInstanceError();
      }
      bodyEl
        .querySelectorAll(
          '.proto-instance-addr, .proto-instance-port, .proto-instance-weight, .proto-domain-addr',
        )
        .forEach(function (input) {
          input.addEventListener('input', refreshEndpointHost);
          input.addEventListener('change', refreshEndpointHost);
        });

      var addKey = bodyEl.querySelector('#provider-add-key');
      if (addKey) {
        addKey.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          state.data.keys.push({ name: '', key: '' });
          render();
        });
      }
      bodyEl
        .querySelectorAll('[data-action="remove-key"]')
        .forEach(function (btn) {
          btn.addEventListener('click', function () {
            syncFromDom(bodyEl, state.data);
            state.data.keys.splice(
              parseInt(btn.getAttribute('data-index'), 10),
              1,
            );
            render();
          });
        });

      var addPathBtn = bodyEl.querySelector('#proto-add-path');
      if (addPathBtn) {
        addPathBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          var paths = state.data.protocol_paths || {};
          var protocols = state.data.model_protocols || PROTOCOL_OPTIONS;
          var available = protocols.filter(function (p) {
            return !paths.hasOwnProperty(p);
          });
          var proto = available.length ? available[0] : PROTOCOL_OPTIONS[0];
          paths[proto] = '';
          state.data.protocol_paths = paths;
          render();
        });
      }
      bodyEl
        .querySelectorAll('[data-action="remove-path"]')
        .forEach(function (btn) {
          btn.addEventListener('click', function () {
            syncFromDom(bodyEl, state.data);
            var row = btn.closest('tr');
            var protoSel = row && row.querySelector('.proto-path-proto-select');
            var proto = protoSel ? protoSel.value : '';
            if (proto) {
              var paths = state.data.protocol_paths || {};
              delete paths[proto];
              state.data.protocol_paths = paths;
              render();
            }
          });
        });

      var discoverBtn = bodyEl.querySelector('#provider-discover-models');
      if (discoverBtn) {
        discoverBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          if (!canDiscoverModels(state.data)) return;
          var payload = buildDiscoverPayload(state.data);
          var discoverErr = validateDiscoverPayload(payload);
          if (discoverErr) {
            Prototype.toast(discoverErr, 'error');
            return;
          }
          discoverBtn.disabled = true;
          setTimeout(function () {
            var discovered = mockDiscoverModels(payload);
            state.data.models = discovered.slice();
            render();
          }, 400);
        });
      }
      refreshDiscoverButton();

      var batchAddBtn = bodyEl.querySelector('#provider-batch-add-models');
      if (batchAddBtn) {
        batchAddBtn.addEventListener('click', function () {
          var textarea = document.getElementById('provider-batch-models-text');
          if (textarea) textarea.value = '';
          Prototype.openModal(BATCH_MODAL_ID);
        });
      }
      var batchConfirmBtn = document.getElementById(
        'provider-batch-models-confirm',
      );
      if (batchConfirmBtn) {
        batchConfirmBtn.onclick = function () {
          syncFromDom(bodyEl, state.data);
          var textarea = document.getElementById('provider-batch-models-text');
          var parsed = parseModelNames(textarea && textarea.value);
          if (!parsed.length) {
            Prototype.toast('请输入至少一个模型名称', 'info');
            return;
          }
          var added = mergeModels(state.data, parsed);
          Prototype.closeModal(BATCH_MODAL_ID);
          notifyModelsMerged(added);
          render();
        };
      }

      bodyEl.querySelectorAll('.proto-model-remove').forEach(function (icon) {
        icon.addEventListener('click', function (e) {
          e.stopPropagation();
          var value = icon.getAttribute('data-value');
          state.data.models = (state.data.models || []).filter(function (item) {
            return item !== value;
          });
          render();
        });
      });

      var modelInput = bodyEl.querySelector('.proto-model-input');
      if (modelInput) {
        modelInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            var value = String(modelInput.value || '').trim();
            if (!value) return;
            var list = state.data.models || [];
            if (list.indexOf(value) === -1) {
              list.push(value);
              state.data.models = list;
            }
            render();
          }
        });
        modelInput.addEventListener('blur', function () {
          var value = String(modelInput.value || '').trim();
          if (!value) return;
          var list = state.data.models || [];
          if (list.indexOf(value) === -1) {
            list.push(value);
            state.data.models = list;
            render();
          }
        });
        modelInput.addEventListener('paste', function (e) {
          var clipboard =
            e.clipboardData ||
            (e.originalEvent && e.originalEvent.clipboardData);
          var text = clipboard
            ? clipboard.getData('text') || clipboard.getData('text/plain') || ''
            : '';
          var parsed = parseModelNames(text);
          if (parsed.length < 2) return;
          e.preventDefault();
          syncFromDom(bodyEl, state.data);
          var added = mergeModels(state.data, parsed);
          notifyModelsMerged(added);
          render();
        });
      }

      var submitBtn =
        footerEl && footerEl.querySelector('#provider-upsert-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          var err = validate(
            state.data,
            state.isAdd,
            state.existingNames,
            state.instanceMode,
          );
          if (err) {
            syncInstanceError();
            if (!isInstanceError(err)) {
              Prototype.toast(err, 'error');
            }
            return;
          }
          if (typeof options.onSubmit === 'function')
            options.onSubmit(state.data);
        });
      }
    }

    if (bodyEl._protocolOutsideClose) {
      document.removeEventListener('click', bodyEl._protocolOutsideClose);
    }
    bodyEl._protocolOutsideClose = function (e) {
      var wrap = bodyEl.querySelector('.proto-protocol-select');
      if (!wrap || wrap.contains(e.target)) return;
      var dropdown = wrap.querySelector('.proto-protocol-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    };
    document.addEventListener('click', bodyEl._protocolOutsideClose);

    render();
    return {
      getData: function () {
        return state.data;
      },
    };
  }

  return {
    createDefaultData: createDefaultData,
    renderForm: renderForm,
    renderDetail: renderDetail,
    mount: mount,
  };
})();
