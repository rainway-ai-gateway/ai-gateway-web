window.ClusterUpsert = (function () {
  var STEP_DEFS = [
    { content: '基本配置' },
    { content: '超时和重传' },
    { content: '被动健康检查' },
    { content: '大模型配置' },
    { content: '复查&检查' },
  ];

  var HASH_STRATEGY_OPTIONS = [
    'CLIENT_IP_ONLY',
    'CLIENT_ID_ONLY',
    'CLIENT_ID_PREFERED',
  ];

  function getProviders() {
    return (window.MockData && MockData.providers) || [];
  }

  function getProviderByName(name) {
    return (
      getProviders().find(function (item) {
        return item.name === name;
      }) || null
    );
  }

  // 名称格式校验：1-64 字符，字母或数字开头结尾，允许字母、数字、_、-、.
  function validateClusterNameFormat(name) {
    if (!name) return false;
    if (name.length < 1 || name.length > 64) return false;
    return /^[A-Za-z0-9][A-Za-z0-9_.-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/.test(name);
  }

  // 描述长度校验
  function validateDescription(desc) {
    if (!desc) return true;
    if (desc.length > 256) return false;
    // 不能包含控制字符
    if (/[\x00-\x1F\x7F]/.test(desc)) return false;
    return true;
  }

  function ensurePrefilledData(data) {
    if (
      !data.llmConfigData.model_mappings ||
      !data.llmConfigData.model_mappings.length
    ) {
      data.llmConfigData.model_mappings = [
        { source_model: 'gpt-4-turbo', target_model: 'gpt-4o' },
      ];
    }
    if (
      !Array.isArray(data.llmConfigData.keys) ||
      !data.llmConfigData.keys.length
    ) {
      data.llmConfigData.keys = [{ name: '', weight: 100 }];
    }
    if (!data.llmConfigData.key_policy) {
      data.llmConfigData.key_policy = {
        strategy: 'weighted_random',
        max_retries: 0,
        retry_backoff_initial: 500,
        retry_backoff_max: 5000,
      };
    }
    if (!data.llmConfigData.key_affinity) {
      data.llmConfigData.key_affinity = {
        enabled: false,
        ttl: 600,
        redis_prefix: 'bfe:ai:key_affinity',
        penalty_enable: true,
      };
    }
  }

  function createDefaultData(row) {
    row = row || {};
    var providerName = row.provider || '';
    var provider = getProviderByName(providerName);
    return {
      balance_mode: row.balance_mode || 'WRR',
      epp_config: row.epp_config
        ? JSON.parse(JSON.stringify(row.epp_config))
        : null,
      baseConfigData: {
        name: row.name || '',
        description: row.description || '',
        protocol: 'https',
        connection: {
          max_idle_conn_per_rs: 0,
          cancel_on_client_close: 'false',
        },
        buffers: { req_write_buffer_size: 512 },
        sticky_sessions: {
          enabled: 'false',
          hash_strategy: 'CLIENT_IP_ONLY',
          hash_header: '',
        },
        timeouts: {
          timeout_conn_serv: 50000,
          timeout_response_header: 50000,
          timeout_readbody_client: 30000,
          timeout_read_client_again: 30000,
          timeout_write_client: 60000,
        },
        retries: {
          max_retry_in_cluster: 2,
        },
      },
      passiveHealthData: {
        interval: 1000,
        failnum: 3,
        host: '',
        uri: '/',
        statuscode: 0,
      },
      llmConfigData: {
        provider: providerName,
        strip_prefix: false,
        match_prefix: '',
        models: provider && provider.models ? provider.models.slice() : [],
        model_mappings: [
          { source_model: 'gpt-4-turbo', target_model: 'gpt-4o' },
        ],
        keys:
          provider && provider.keys && provider.keys.length
            ? [{ name: provider.keys[0].name, weight: 100 }]
            : [{ name: '', weight: 100 }],
        key_policy: {
          strategy: 'weighted_random',
          max_retries: 0,
          retry_backoff_initial: 500,
          retry_backoff_max: 5000,
        },
        key_affinity: {
          enabled: false,
          ttl: 600,
          redis_prefix: 'bfe:ai:key_affinity',
          penalty_enable: true,
        },
      },
    };
  }

  // ============ 基本配置 ============
  function renderBaseConfig(data, isAdd, clusterNames) {
    var b = data.baseConfigData;
    var stickyEnabled = b.sticky_sessions.enabled === 'true';

    var hashStrategyBlock = stickyEnabled
      ? IvuUI.formTopItem(
          '哈希策略',
          '<select class="proto-field from-item-inp" data-field="base.sticky_sessions.hash_strategy" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
            HASH_STRATEGY_OPTIONS.map(function (item) {
              return (
                '<option value="' +
                item +
                '"' +
                (b.sticky_sessions.hash_strategy === item ? ' selected' : '') +
                '>' +
                item +
                '</option>'
              );
            }).join('') +
            '</select>',
          true,
        )
      : '';

    var hashHeaderBlock =
      stickyEnabled && b.sticky_sessions.hash_strategy !== 'CLIENT_IP_ONLY'
        ? IvuUI.formTopItem(
            '哈希头部',
            '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="base.sticky_sessions.hash_header" value="' +
              IvuUI.escapeHtml(b.sticky_sessions.hash_header) +
              '" /></div>',
            true,
          )
        : '';

    return IvuUI.formTop(
      IvuUI.formTopItem(
        '集群名称',
        '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="base.name" value="' +
          IvuUI.escapeHtml(b.name) +
          '" ' +
          (isAdd ? '' : 'disabled="disabled" ') +
          'placeholder="1-64个字符，以字母或数字开头和结尾，支持字母、数字、下划线、连字符、点"/></div>',
        true,
      ) +
        IvuUI.formTopItem(
          '集群说明',
          '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="base.description" value="' +
            IvuUI.escapeHtml(b.description) +
            '" placeholder="最多256个字符，不能包含控制字符"/></div>',
        ) +
        IvuUI.formTopItem(
          '协议',
          '<select class="proto-field from-item-inp" data-field="base.protocol" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
            '<option value="http"' +
            (b.protocol === 'http' ? ' selected' : '') +
            '>http</option>' +
            '<option value="https"' +
            (b.protocol === 'https' ? ' selected' : '') +
            '>https</option>' +
            '</select>',
          true,
        ) +
        IvuUI.formTopItem(
          '单个后端最大空闲连接数',
          IvuUI.inputNumber(
            b.connection.max_idle_conn_per_rs,
            'class="proto-field" data-field="base.connection.max_idle_conn_per_rs" min="0"',
          ),
          true,
        ) +
        IvuUI.formTopItem(
          '会话保持启用',
          '<select class="proto-field from-item-inp" data-field="base.sticky_sessions.enabled" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
            '<option value="true"' +
            (b.sticky_sessions.enabled === 'true' ? ' selected' : '') +
            '>启用</option>' +
            '<option value="false"' +
            (b.sticky_sessions.enabled === 'false' ? ' selected' : '') +
            '>停用</option>' +
            '</select>',
          true,
        ) +
        hashStrategyBlock +
        hashHeaderBlock +
        IvuUI.formTopItem(
          '请求写缓存大小（Byte）',
          IvuUI.inputNumber(
            b.buffers.req_write_buffer_size,
            'class="proto-field" data-field="base.buffers.req_write_buffer_size" min="1"',
          ),
          true,
        ) +
        IvuUI.formTopItem(
          '后端连接随客户端连接关闭 ',
          '<select class="proto-field from-item-inp" data-field="base.connection.cancel_on_client_close" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
            '<option value="true"' +
            (b.connection.cancel_on_client_close === 'true'
              ? ' selected'
              : '') +
            '>启用</option>' +
            '<option value="false"' +
            (b.connection.cancel_on_client_close === 'false'
              ? ' selected'
              : '') +
            '>停用</option>' +
            '</select>',
          true,
        ),
    );
  }

  // ============ 超时和重传 ============
  function renderTimeout(data) {
    var t = data.baseConfigData.timeouts;
    var r = data.baseConfigData.retries;
    return IvuUI.formTop(
      IvuUI.formTopItem(
        '客户端连接空闲超时(ms) ',
        IvuUI.inputNumber(
          t.timeout_read_client_again,
          'class="proto-field" data-field="base.timeouts.timeout_read_client_again" min="1"',
        ),
        true,
      ) +
        IvuUI.formTopItem(
          '读客户端请求Body超时(ms)',
          IvuUI.inputNumber(
            t.timeout_readbody_client,
            'class="proto-field" data-field="base.timeouts.timeout_readbody_client" min="1"',
          ),
          true,
        ) +
        IvuUI.formTopItem(
          '连接后端超时(ms) ',
          IvuUI.inputNumber(
            t.timeout_conn_serv,
            'class="proto-field" data-field="base.timeouts.timeout_conn_serv" min="1"',
          ),
          true,
        ) +
        IvuUI.formTopItem(
          '读后端响应头部超时(ms) ',
          IvuUI.inputNumber(
            t.timeout_response_header,
            'class="proto-field" data-field="base.timeouts.timeout_response_header" min="1"',
          ),
          true,
        ) +
        IvuUI.formTopItem(
          '写客户端响应Body超时(ms)',
          IvuUI.inputNumber(
            t.timeout_write_client,
            'class="proto-field" data-field="base.timeouts.timeout_write_client" min="1"',
          ),
          true,
        ) +
        IvuUI.formTopItem(
          '同集群重试次数',
          IvuUI.inputNumber(
            r.max_retry_in_cluster,
            'class="proto-field" data-field="base.retries.max_retry_in_cluster" min="0"',
          ),
          true,
        ),
    );
  }

  // ============ 被动健康检查 ============
  function renderPassiveHealth(data) {
    var h = data.passiveHealthData;
    return (
      '<div class="health-check">' +
      IvuUI.formTop(
        IvuUI.formTopItem(
          '故障阈值（触发设置实例为不可用，启动被动健康检查）',
          IvuUI.inputNumber(
            h.failnum,
            'class="proto-field from-item-inp" data-field="health.failnum" min="0"',
          ),
          true,
        ) +
          IvuUI.formTopItem(
            '健康检查间隔(ms)',
            IvuUI.inputNumber(
              h.interval,
              'class="proto-field from-item-inp" data-field="health.interval" min="0"',
            ),
            true,
          ) +
          IvuUI.formTopItem(
            '健康检查Host',
            '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="health.host" value="' +
              IvuUI.escapeHtml(h.host) +
              '" placeholder="为空时使用所属服务商首个实例地址" /></div>',
          ) +
          IvuUI.formTopItem(
            '健康检查Uri',
            '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="health.uri" value="' +
              IvuUI.escapeHtml(h.uri) +
              '" placeholder="/" /></div>',
            true,
          ) +
          IvuUI.formTopItem(
            '健康检查期望的状态码',
            IvuUI.inputNumber(
              h.statuscode,
              'class="proto-field from-item-inp" data-field="health.statuscode" min="0"',
            ),
            true,
          ),
      ) +
      '</div>'
    );
  }

  // ============ 大模型配置 ============
  function renderGatewayConfig(data) {
    ensurePrefilledData(data);
    var llm = data.llmConfigData;
    var provider = getProviderByName(llm.provider);
    var providerModels = (provider && provider.models) || [];
    var providerKeys = (provider && provider.keys) || [];

    function availableProviderKeys(index) {
      var keys = llm.keys || [];
      var current = String((keys[index] && keys[index].name) || '').trim();
      var taken = {};
      keys.forEach(function (item, i) {
        if (i === index) return;
        var name = String((item && item.name) || '').trim();
        if (name) taken[name] = true;
      });
      return providerKeys.filter(function (item) {
        var name = item && item.name;
        if (!name) return false;
        return name === current || !taken[name];
      });
    }

    function helpIcon(tip) {
      return (
        '<span class="form-help-icon" title="' +
        IvuUI.escapeHtml(tip || '') +
        '">?</span>'
      );
    }

    var providerSelectHtml =
      '<div class="ivu-select ivu-select-single" style="width:100%;">' +
      '<div class="ivu-select-selection">' +
      '<select class="proto-field proto-ivu-select-native" data-field="llm.provider" id="cluster-provider-select" style="width:100%;height:32px;border:0;background:transparent;padding:0 24px 0 8px;appearance:none;">' +
      '<option value="">请选择已创建的服务商</option>' +
      getProviders()
        .map(function (item) {
          return (
            '<option value="' +
            IvuUI.escapeHtml(item.name) +
            '"' +
            (llm.provider === item.name ? ' selected' : '') +
            '>' +
            IvuUI.escapeHtml(item.name) +
            '</option>'
          );
        })
        .join('') +
      '</select>' +
      '<span class="proto-select-arrow" aria-hidden="true">▾</span>' +
      '</div></div>';

    var stripSwitchHtml =
      '<div class="ivu-switch' +
      (llm.strip_prefix ? ' ivu-switch-checked' : '') +
      '" id="proto-strip-prefix-switch">' +
      '<span class="ivu-switch-inner"></span></div>';

    var stripPrefixHtml =
      IvuUI.formTopItem(
        '裁剪前缀' + helpIcon('开启后转发前去掉 match_prefix'),
        stripSwitchHtml,
      ) +
      (llm.strip_prefix
        ? IvuUI.formTopItem(
            '匹配前缀',
            '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="llm.match_prefix" value="' +
              IvuUI.escapeHtml(llm.match_prefix || '') +
              '" placeholder="必须以 / 结尾，如 openrouter/" /></div>',
            true,
          )
        : '');

    var selectedModels = llm.models || [];
    var modelTagsHtml = selectedModels.length
      ? selectedModels
          .map(function (m) {
            return (
              '<span class="ivu-tag ivu-tag-primary ivu-tag-checked ivu-tag-closable proto-forward-model-tag">' +
              '<span class="ivu-tag-text">' +
              IvuUI.escapeHtml(m) +
              '</span>' +
              '<i class="ivu-icon ivu-icon-ios-close proto-protocol-remove proto-forward-model-remove" data-value="' +
              IvuUI.escapeHtml(m) +
              '"></i></span>'
            );
          })
          .join('')
      : '<span class="ivu-select-placeholder">' +
        (provider ? '请选择转发模型（可多选）' : '请先选择所属服务商') +
        '</span>';

    var allModelsSelected =
      providerModels.length > 0 &&
      providerModels.every(function (model) {
        return selectedModels.indexOf(model) !== -1;
      });

    var selectAllOption =
      providerModels.length && !allModelsSelected
        ? '<li class="ivu-select-item proto-forward-model-option proto-forward-select-all" data-value="__SELECT_ALL__">全选</li>'
        : '';

    var modelOptions =
      selectAllOption +
      (providerModels.length
        ? providerModels
            .map(function (model) {
              var on = selectedModels.indexOf(model) !== -1;
              return (
                '<li class="ivu-select-item proto-forward-model-option' +
                (on ? ' ivu-select-item-selected' : '') +
                '" data-value="' +
                IvuUI.escapeHtml(model) +
                '">' +
                IvuUI.escapeHtml(model) +
                '</li>'
              );
            })
            .join('')
        : '<li class="ivu-select-item" style="color:#c5c8ce;cursor:default;">暂无模型</li>');

    var modelSelectHtml =
      '<div class="ivu-select ivu-select-multiple proto-protocol-select proto-forward-model-select' +
      (provider ? '' : ' ivu-select-disabled') +
      '">' +
      '<div class="ivu-select-selection proto-forward-model-toggle">' +
      modelTagsHtml +
      '<i class="ivu-icon ivu-icon-ios-arrow-down ivu-select-arrow"></i></div>' +
      '<div class="ivu-select-dropdown proto-protocol-dropdown proto-forward-model-dropdown" style="display:none;">' +
      '<ul class="ivu-select-dropdown-list">' +
      modelOptions +
      '</ul></div></div>';

    var mappingRows = (llm.model_mappings || [])
      .map(function (mapping, index) {
        return (
          '<tr data-mapping-index="' +
          index +
          '">' +
          '<td><div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-mapping-key" data-index="' +
          index +
          '" value="' +
          IvuUI.escapeHtml(mapping.source_model || '') +
          '" placeholder="请输入原模型名称" /></div></td>' +
          '<td><select class="proto-mapping-value" data-index="' +
          index +
          '" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
          '<option value="">请选择目标模型</option>' +
          (llm.models || [])
            .map(function (model) {
              return (
                '<option value="' +
                IvuUI.escapeHtml(model) +
                '"' +
                (mapping.target_model === model ? ' selected' : '') +
                '>' +
                IvuUI.escapeHtml(model) +
                '</option>'
              );
            })
            .join('') +
          '</select></td>' +
          '<td style="width:80px;">' +
          '<button type="button" class="ivu-btn ivu-btn-error ivu-btn-small" data-action="remove-mapping" data-index="' +
          index +
          '"><span>删除</span></button></td></tr>'
        );
      })
      .join('');

    var keyRows = (llm.keys || [])
      .map(function (keyItem, index) {
        return (
          '<tr data-key-index="' +
          index +
          '">' +
          '<td><select class="proto-key-name" data-index="' +
          index +
          '" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;"' +
          (provider ? '' : ' disabled') +
          '>' +
          '<option value="">请选择 Key</option>' +
          availableProviderKeys(index)
            .map(function (item) {
              return (
                '<option value="' +
                IvuUI.escapeHtml(item.name) +
                '"' +
                (keyItem.name === item.name ? ' selected' : '') +
                '>' +
                IvuUI.escapeHtml(item.name) +
                '</option>'
              );
            })
            .join('') +
          '</select></td>' +
          '<td style="width:120px;"><input type="number" class="ivu-input proto-key-weight" data-index="' +
          index +
          '" min="0" max="100" value="' +
          (keyItem.weight != null ? keyItem.weight : 0) +
          '" /></td>' +
          '<td style="width:80px;"><button type="button" class="ivu-btn ivu-btn-error ivu-btn-small" data-action="remove-key" data-index="' +
          index +
          '"><span>删除</span></button></td></tr>'
        );
      })
      .join('');

    var validKeys = (llm.keys || []).filter(function (k) {
      return k.name && k.name.trim();
    });
    var keyWeightSum = validKeys.reduce(function (sum, k) {
      return sum + (Number(k.weight) || 0);
    }, 0);
    var keyWeightTip =
      validKeys.length > 0 && keyWeightSum !== 100
        ? '<p class="proto-keys-error" style="color:#ed4014;font-size:12px;margin:8px 0 0;">所有 Key 的权重之和必须等于 100</p>'
        : '';

    var kp = llm.key_policy || {};
    var keyPolicyHtml =
      '<div class="llm-card-title">Key 策略</div>' +
      '<div class="ivu-row" style="margin-left:-12px;margin-right:-12px;">' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '策略',
        '<select class="proto-field" data-field="llm.key_policy.strategy" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
          '<option value="weighted_random"' +
          (kp.strategy === 'weighted_random' ? ' selected' : '') +
          '>weighted_random</option></select>',
      ) +
      '</div>' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '最大重试次数',
        IvuUI.inputNumber(
          kp.max_retries,
          'class="proto-field" data-field="llm.key_policy.max_retries" min="0"',
        ),
      ) +
      '</div></div>' +
      '<div class="ivu-row" style="margin-left:-12px;margin-right:-12px;">' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '初始退避时间(ms)',
        IvuUI.inputNumber(
          kp.retry_backoff_initial,
          'class="proto-field" data-field="llm.key_policy.retry_backoff_initial" min="0"',
        ),
      ) +
      '</div>' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '最大退避时间(ms)',
        IvuUI.inputNumber(
          kp.retry_backoff_max,
          'class="proto-field" data-field="llm.key_policy.retry_backoff_max" min="0"',
        ),
      ) +
      '</div></div>';

    var ka = llm.key_affinity || {};
    function ivuSelectNative(field, value, options) {
      return (
        '<div class="ivu-select ivu-select-single" style="width:100%;">' +
        '<div class="ivu-select-selection">' +
        '<select class="proto-field proto-ivu-select-native" data-field="' +
        field +
        '" style="width:100%;height:32px;border:0;background:transparent;padding:0 24px 0 8px;appearance:none;">' +
        options
          .map(function (opt) {
            return (
              '<option value="' +
              IvuUI.escapeHtml(opt.value) +
              '"' +
              (opt.value === String(value) ? ' selected' : '') +
              '>' +
              IvuUI.escapeHtml(opt.label) +
              '</option>'
            );
          })
          .join('') +
        '</select></div></div>'
      );
    }

    var keyAffinityHtml =
      '<div class="llm-card-title">Key 亲和性</div>' +
      '<div class="ivu-row" style="margin-left:-12px;margin-right:-12px;">' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '是否启用' +
          helpIcon(
            '开启后，同一会话的请求将绑定到同一 Key，避免会话内切换时 Key 漂移',
          ),
        ivuSelectNative('llm.key_affinity.enabled', ka.enabled, [
          { value: 'false', label: '停用' },
          { value: 'true', label: '启用' },
        ]),
      ) +
      '</div></div>' +
      (ka.enabled
        ? '<div class="ivu-row" style="margin-left:-12px;margin-right:-12px;">' +
          '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
          IvuUI.formTopItem(
            '空闲超时(秒)',
            IvuUI.inputNumber(
              ka.ttl,
              'class="proto-field" data-field="llm.key_affinity.ttl" min="1"',
            ),
          ) +
          '</div>' +
          '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
          IvuUI.formTopItem(
            'Key 惩罚' +
              helpIcon('开启后，失败的 Key 会被临时惩罚，降低再次被选中概率'),
            ivuSelectNative(
              'llm.key_affinity.penalty_enable',
              ka.penalty_enable,
              [
                { value: 'false', label: '关闭' },
                { value: 'true', label: '开启' },
              ],
            ),
          ) +
          '</div></div>' +
          '<div class="ivu-row" style="margin-left:-12px;margin-right:-12px;">' +
          '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
          IvuUI.formTopItem(
            'Redis Key 前缀',
            '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="llm.key_affinity.redis_prefix" value="' +
              IvuUI.escapeHtml(ka.redis_prefix || '') +
              '" /></div>',
            true,
          ) +
          '</div></div>'
        : '');

    var instanceHint = '';
    // if (provider && provider.instance_pool && provider.instance_pool.length) {
    //   instanceHint =
    //     '<p style="color:#808695;font-size:12px;margin:0 0 12px;">后端实例由服务商管理：' +
    //     provider.instance_pool
    //       .map(function (item) {
    //         return IvuUI.escapeHtml(item.addr + ':' + item.port);
    //       })
    //       .join('、') +
    //     '。如需调整请前往「模型服务商」。</p>';
    // }

    return (
      '<div class="gateway-config">' +
      '<div class="llm-card"><div class="llm-card-title">模型服务配置</div><div class="llm-card-body">' +
      instanceHint +
      IvuUI.formTop(
        IvuUI.formTopItem(
          '所属服务商' + helpIcon('必填，引用 /providers 中已存在的服务商'),
          providerSelectHtml,
          true,
        ) +
          IvuUI.formTopItem(
            '转发模型' +
              helpIcon('多选；选择所属服务商后展示该服务商的模型列表'),
            modelSelectHtml,
            true,
          ) +
          stripPrefixHtml,
      ) +
      '</div></div>' +
      '<div class="llm-card"><div class="llm-card-title">模型重定向</div><div class="llm-card-body">' +
      '<table class="mapping-table" style="width:100%;border-collapse:collapse;border:1px solid #e7e9f0;">' +
      '<thead><tr style="background:#f8f8f9;"><th>原请求的模型名称</th><th>转发的后端模型名称</th><th style="width:80px;">操作</th></tr></thead>' +
      '<tbody>' +
      mappingRows +
      '</tbody></table>' +
      '<button type="button" class="ivu-btn ivu-btn-primary ivu-btn-small" id="cluster-add-mapping" style="margin-top:20px;"><span>+添加</span></button>' +
      '</div></div>' +
      '<div class="llm-card"><div class="llm-card-title">Keys配置</div><div class="llm-card-body">' +
      '<table class="keys-table" style="width:100%;border-collapse:collapse;border:1px solid #e7e9f0;">' +
      '<thead><tr style="background:#f8f8f9;"><th>Key</th><th style="width:120px;">权重</th><th style="width:80px;">操作</th></tr></thead>' +
      '<tbody>' +
      keyRows +
      '</tbody></table>' +
      '<button type="button" class="ivu-btn ivu-btn-primary ivu-btn-small" id="cluster-add-key" style="margin-top:20px;"><span>+添加 Key</span></button>' +
      keyWeightTip +
      '</div></div>' +
      '<div class="llm-card"><div class="llm-card-body">' +
      keyPolicyHtml +
      '</div></div>' +
      '<div class="llm-card"><div class="llm-card-body">' +
      keyAffinityHtml +
      '</div></div>' +
      '<div class="llm-card"><div class="llm-card-title">均衡模式配置</div><div class="llm-card-body">' +
      IvuUI.formTop(
        IvuUI.formTopItem(
          '负载均衡模式' + helpIcon('WRR: 加权轮询; EPP: EPP 调度'),
          '<select class="proto-field from-item-inp" data-field="epp.balance_mode" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
            '<option value="WRR"' +
            (data.balance_mode === 'WRR' ? ' selected' : '') +
            '>WRR（加权轮询）</option>' +
            '<option value="EPP"' +
            (data.balance_mode === 'EPP' ? ' selected' : '') +
            '>EPP（EPP 调度）</option>' +
            '</select>',
          true,
        ),
      ) +
      renderEppConfig(data) +
      '</div></div>' +
      '</div>'
    );
  }

  // ============ 调度配置（EPP 相关） ============
  function renderEppConfig(data) {
    var epp = data;
    var ec = epp.epp_config || {};
    var fc = ec.flow_control || {};
    var isEpp = epp.balance_mode === 'EPP';

    function helpIcon(tip) {
      return (
        '<span class="form-help-icon" title="' +
        IvuUI.escapeHtml(tip || '') +
        '">?</span>'
      );
    }

    var eppConfigHtml = '';
    if (isEpp) {
      var schedulingProfileHtml = IvuUI.formTopItem(
        '调度策略' +
          helpIcon(
            'latency-first: 延迟优先; balanced: 均衡; throughput-first: 吞吐优先',
          ),
        '<select class="proto-field from-item-inp" data-field="epp.epp_config.scheduling_profile" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
          '<option value="latency-first"' +
          (ec.scheduling_profile === 'latency-first' ? ' selected' : '') +
          '>latency-first（延迟优先）</option>' +
          '<option value="balanced"' +
          (ec.scheduling_profile === 'balanced' ? ' selected' : '') +
          '>balanced（均衡）</option>' +
          '<option value="throughput-first"' +
          (ec.scheduling_profile === 'throughput-first' ? ' selected' : '') +
          '>throughput-first（吞吐优先）</option>' +
          '</select>',
        true,
      );

      var cacheAffinityHtml = IvuUI.formTopItem(
        '缓存亲和性' + helpIcon('默认 medium 表示跟随调度策略'),
        '<select class="proto-field from-item-inp" data-field="epp.epp_config.cache_affinity" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
          '<option value="low"' +
          (ec.cache_affinity === 'low' ? ' selected' : '') +
          '>low</option>' +
          '<option value="medium"' +
          (ec.cache_affinity === 'medium' ? ' selected' : '') +
          '>medium（跟随调度策略）</option>' +
          '<option value="high"' +
          (ec.cache_affinity === 'high' ? ' selected' : '') +
          '>high</option>' +
          '</select>',
        true,
      );

      var prefixCacheSwitchHtml =
        '<div class="ivu-switch' +
        (ec.prefix_cache_affinity ? ' ivu-switch-checked' : '') +
        '" id="proto-epp-prefix-cache-switch">' +
        '<span class="ivu-switch-inner"></span></div>';

      var prefixCacheHtml = IvuUI.formTopItem(
        '前缀缓存亲和性' + helpIcon('开启后优先复用已有前缀缓存'),
        prefixCacheSwitchHtml,
      );

      var sessionAffinitySwitchHtml =
        '<div class="ivu-switch' +
        (ec.session_affinity_enabled ? ' ivu-switch-checked' : '') +
        '" id="proto-epp-session-affinity-switch">' +
        '<span class="ivu-switch-inner"></span></div>';

      var sessionAffinityHtml = IvuUI.formTopItem(
        '会话亲和性' + helpIcon('开启后同一会话的请求将绑定到同一端点'),
        sessionAffinitySwitchHtml,
        true,
      );

      var sessionAffinityHeaderHtml = ec.session_affinity_enabled
        ? IvuUI.formTopItem(
            '会话亲和性 Header',
            '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input proto-field" data-field="epp.epp_config.session_affinity_header" value="' +
              IvuUI.escapeHtml(ec.session_affinity_header || '') +
              '" placeholder="会话亲和性启用时必填" /></div>',
            true,
          )
        : '';

      var kvCacheHtml = IvuUI.formTopItem(
        'KV 缓存利用率上限' + helpIcon('范围 (0, 1]，步长 0.01'),
        IvuUI.inputNumber(
          ec.kv_cache_utilization_max != null
            ? ec.kv_cache_utilization_max
            : 0.9,
          'class="proto-field" data-field="epp.epp_config.kv_cache_utilization_max" min="0" max="1" step="0.01"',
        ),
        true,
      );

      var enableEvictionSwitchHtml =
        '<div class="ivu-switch' +
        (fc.enable_eviction ? ' ivu-switch-checked' : '') +
        '" id="proto-epp-enable-eviction-switch">' +
        '<span class="ivu-switch-inner"></span></div>';

      var flowControlHtml =
        '<div class="llm-card"><div class="llm-card-title" id="proto-epp-flow-control-toggle" style="cursor:pointer;">流控配置 ▾</div><div class="llm-card-body" id="proto-epp-flow-control-body">' +
        IvuUI.formTop(
          IvuUI.formTopItem(
            '最大请求数' + helpIcon('大于 0 的整数或 -1 表示不限制'),
            '<div class="ivu-input-wrapper ivu-input-type-text"><input type="number" class="ivu-input proto-field" data-field="epp.epp_config.flow_control.max_requests" value="' +
              (fc.max_requests != null && fc.max_requests !== ''
                ? fc.max_requests
                : '') +
              '" placeholder="-1 表示不限制" /></div>',
            true,
          ) +
            IvuUI.formTopItem(
              '队列 TTL（秒）',
              '<div class="ivu-input-wrapper ivu-input-type-text"><input type="number" class="ivu-input proto-field" data-field="epp.epp_config.flow_control.queue_ttl" value="' +
                (fc.queue_ttl != null && fc.queue_ttl !== ''
                  ? fc.queue_ttl
                  : '') +
                '" min="0" /></div>',
              true,
            ) +
            IvuUI.formTopItem(
              '无端点队列 TTL（秒）',
              '<div class="ivu-input-wrapper ivu-input-type-text"><input type="number" class="ivu-input proto-field" data-field="epp.epp_config.flow_control.no_endpoint_queue_ttl" value="' +
                (fc.no_endpoint_queue_ttl != null &&
                fc.no_endpoint_queue_ttl !== ''
                  ? fc.no_endpoint_queue_ttl
                  : '') +
                '" min="0" /></div>',
              true,
            ) +
            IvuUI.formTopItem('启用驱逐', enableEvictionSwitchHtml, true),
        ) +
        '</div></div>';

      eppConfigHtml =
        IvuUI.formTop(
          schedulingProfileHtml +
            cacheAffinityHtml +
            prefixCacheHtml +
            sessionAffinityHtml +
            sessionAffinityHeaderHtml +
            kvCacheHtml,
        ) + flowControlHtml;
    }

    return '<div class="epp-config">' + eppConfigHtml + '</div>';
  }

  function renderReviewPanel(title, rowsHtml) {
    return (
      '<div class="panel"><div class="panel-header">' +
      title +
      '</div><div class="panel-body">' +
      rowsHtml +
      '</div></div>'
    );
  }

  function reviewRow(label, value) {
    return (
      '<ul class="clearFloat"><li class="title">' +
      IvuUI.escapeHtml(label) +
      ':</li><li class="value">' +
      (value != null && value !== '' ? IvuUI.escapeHtml(value) : '-') +
      '</li></ul>'
    );
  }

  function renderReview(data) {
    ensurePrefilledData(data);
    var b = data.baseConfigData;
    var h = data.passiveHealthData;
    var llm = data.llmConfigData;
    var provider = getProviderByName(llm.provider);
    var balanceMode = data.balance_mode || 'WRR';
    var ec = data.epp_config || {};
    var fc = ec.flow_control || {};
    var isEpp = balanceMode === 'EPP';
    var stickyEnabled =
      b.sticky_sessions && b.sticky_sessions.enabled === 'true';

    var basicRows =
      reviewRow('集群名称', b.name) +
      reviewRow('集群说明', b.description) +
      reviewRow('协议', b.protocol) +
      reviewRow('单个后端最大空闲连接数', b.connection.max_idle_conn_per_rs) +
      reviewRow('会话保持启用', stickyEnabled ? '启用' : '停用') +
      (stickyEnabled
        ? reviewRow('哈希策略', b.sticky_sessions.hash_strategy)
        : '') +
      (stickyEnabled && b.sticky_sessions.hash_strategy !== 'CLIENT_IP_ONLY'
        ? reviewRow('哈希头部', b.sticky_sessions.hash_header)
        : '') +
      reviewRow('请求写缓存大小（Byte）', b.buffers.req_write_buffer_size) +
      reviewRow(
        '后端连接随客户端连接关闭',
        b.connection.cancel_on_client_close === 'true' ? '启用' : '停用',
      );

    var timeoutRows =
      reviewRow(
        '客户端连接空闲超时(ms)',
        b.timeouts.timeout_read_client_again,
      ) +
      reviewRow(
        '读客户端请求Body超时(ms)',
        b.timeouts.timeout_readbody_client,
      ) +
      reviewRow('连接后端超时(ms)', b.timeouts.timeout_conn_serv) +
      reviewRow('读后端响应头部超时(ms)', b.timeouts.timeout_response_header) +
      reviewRow('写客户端响应Body超时(ms)', b.timeouts.timeout_write_client) +
      reviewRow('同集群重试次数', b.retries.max_retry_in_cluster);

    var healthRows =
      reviewRow('故障阈值', h.failnum) +
      reviewRow('健康检查间隔(ms)', h.interval) +
      reviewRow('健康检查Host', h.host || '（使用所属服务商首个实例）') +
      reviewRow('健康检查Uri', h.uri) +
      reviewRow('健康检查期望的状态码', h.statuscode);

    var modelsHtml =
      (llm.models || [])
        .map(function (model) {
          return (
            '<span class="model-tag">' + IvuUI.escapeHtml(model) + '</span>'
          );
        })
        .join('') || '<span class="empty-text">-</span>';

    var keysHtml = '<span class="empty-text">-</span>';
    var validKs = (llm.keys || []).filter(function (k) {
      return k.name && k.name.trim();
    });
    if (validKs.length) {
      keysHtml =
        '<table class="mapping-table"><thead><tr><th>Key</th><th>权重</th></tr></thead><tbody>' +
        validKs
          .map(function (item) {
            return (
              '<tr><td>' +
              IvuUI.escapeHtml(item.name || '') +
              '</td><td>' +
              IvuUI.escapeHtml(item.weight || 0) +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table>';
    }

    var kp = llm.key_policy || {};
    var keyPolicyHtml =
      '<ul class="clearFloat detail-row detail-row-block policy-row"><li class="title">Key 策略:</li><li class="value">' +
      '<div class="policy-card" style="border:1px solid #e7e9f0;border-radius:4px;padding:12px;background:#fafafa;">' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px 24px;">' +
      '<div>策略：' +
      IvuUI.escapeHtml(kp.strategy || 'weighted_random') +
      '</div>' +
      '<div>最大重试次数：' +
      IvuUI.escapeHtml(kp.max_retries != null ? kp.max_retries : 0) +
      '</div>' +
      '<div>初始退避时间(ms)：' +
      IvuUI.escapeHtml(
        kp.retry_backoff_initial != null ? kp.retry_backoff_initial : 500,
      ) +
      '</div>' +
      '<div>最大退避时间(ms)：' +
      IvuUI.escapeHtml(
        kp.retry_backoff_max != null ? kp.retry_backoff_max : 5000,
      ) +
      '</div></div></div></li></ul>';

    var ka = llm.key_affinity || {};
    var keyAffinityHtml =
      '<ul class="clearFloat detail-row detail-row-block policy-row"><li class="title">Key 亲和性:</li><li class="value">' +
      '<div class="policy-card" style="border:1px solid #e7e9f0;border-radius:4px;padding:12px;background:#fafafa;">' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px 24px;">' +
      '<div>启用：' +
      (ka.enabled ? '开启' : '关闭') +
      '</div>' +
      (ka.enabled
        ? '<div>绑定空闲超时(秒)：' +
          IvuUI.escapeHtml(ka.ttl != null ? ka.ttl : 600) +
          '</div>' +
          '<div>Redis Key 前缀：' +
          IvuUI.escapeHtml(ka.redis_prefix || 'bfe:ai:key_affinity') +
          '</div>' +
          '<div>Key 惩罚：' +
          (ka.penalty_enable ? '开启' : '关闭') +
          '</div>'
        : '') +
      '</div></div></div></li></ul>';

    var llmRows =
      reviewRow('所属服务商', llm.provider || '-') +
      '<ul class="clearFloat detail-row"><li class="title">转发模型:</li><li class="value">' +
      modelsHtml +
      '</li></ul>' +
      reviewRow('裁剪前缀', llm.strip_prefix ? '开启' : '关闭') +
      (llm.strip_prefix ? reviewRow('匹配前缀', llm.match_prefix || '-') : '') +
      '<ul class="clearFloat detail-row detail-row-block"><li class="title">模型重定向:</li><li class="value">' +
      (llm.model_mappings && llm.model_mappings.length
        ? '<table class="mapping-table"><thead><tr><th>原请求的模型名称</th><th>转发的后端模型名称</th></tr></thead><tbody>' +
          llm.model_mappings
            .map(function (item) {
              return (
                '<tr><td>' +
                IvuUI.escapeHtml(item.source_model || '') +
                '</td><td>' +
                IvuUI.escapeHtml(item.target_model || '') +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<span class="empty-text">-</span>') +
      '</li></ul>' +
      '<ul class="clearFloat detail-row detail-row-block"><li class="title">服务鉴权 Keys:</li><li class="value">' +
      keysHtml +
      '</li></ul>' +
      keyPolicyHtml +
      keyAffinityHtml;

    var eppConfigRows = '';
    if (isEpp) {
      eppConfigRows =
        reviewRow('负载均衡模式', balanceMode) +
        reviewRow('调度策略', ec.scheduling_profile || 'balanced') +
        reviewRow('缓存亲和性', ec.cache_affinity || 'medium') +
        reviewRow(
          '前缀缓存亲和性',
          ec.prefix_cache_affinity ? '开启' : '关闭',
        ) +
        reviewRow('会话亲和性', ec.session_affinity_enabled ? '开启' : '关闭') +
        (ec.session_affinity_enabled
          ? reviewRow('会话亲和性 Header', ec.session_affinity_header || '-')
          : '') +
        reviewRow(
          'KV 缓存利用率上限',
          ec.kv_cache_utilization_max != null
            ? ec.kv_cache_utilization_max
            : '0.9',
        ) +
        (fc.max_requests != null && fc.max_requests !== ''
          ? reviewRow('流控-最大请求数', fc.max_requests)
          : '') +
        (fc.queue_ttl != null && fc.queue_ttl !== ''
          ? reviewRow('流控-队列 TTL（秒）', fc.queue_ttl)
          : '') +
        (fc.no_endpoint_queue_ttl != null && fc.no_endpoint_queue_ttl !== ''
          ? reviewRow('流控-无端点队列 TTL（秒）', fc.no_endpoint_queue_ttl)
          : '') +
        reviewRow('流控-启用驱逐', fc.enable_eviction ? '开启' : '关闭');
    } else {
      eppConfigRows = reviewRow('负载均衡模式', balanceMode);
    }

    return (
      '<div class="Review">' +
      renderReviewPanel('基本配置', basicRows) +
      renderReviewPanel('超时和重传', timeoutRows) +
      renderReviewPanel('被动健康检查', healthRows) +
      renderReviewPanel('大模型配置', llmRows + eppConfigRows) +
      '</div>'
    );
  }

  function setNestedValue(obj, path, value) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var key = parts[i];
      // 过滤 __proto__/constructor/prototype，避免路径写入污染 Object 原型
      if (key === '__proto__' || key === 'constructor' || key === 'prototype')
        return;
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    var lastKey = parts[parts.length - 1];
    if (
      lastKey === '__proto__' ||
      lastKey === 'constructor' ||
      lastKey === 'prototype'
    )
      return;
    current[lastKey] = value;
  }

  function syncFromDom(root, data) {
    root.querySelectorAll('.proto-field').forEach(function (field) {
      var path = field.getAttribute('data-field');
      if (!path) return;
      var value =
        field.tagName === 'SELECT'
          ? field.value
          : field.type === 'number'
          ? field.value === ''
            ? null
            : Number(field.value)
          : field.value;
      if (path.indexOf('base.') === 0)
        setNestedValue(data.baseConfigData, path.slice(5), value);
      else if (path.indexOf('health.') === 0)
        data.passiveHealthData[path.slice(7)] = value;
      else if (path.indexOf('epp.') === 0) {
        var eppKey = path.slice(4);
        if (eppKey === 'balance_mode') {
          data.balance_mode = value;
        } else if (eppKey.indexOf('epp_config.') === 0) {
          if (!data.epp_config) data.epp_config = {};
          setNestedValue(data.epp_config, eppKey.slice(11), value);
        } else if (eppKey.indexOf('epp_config.flow_control.') === 0) {
          if (!data.epp_config) data.epp_config = {};
          if (!data.epp_config.flow_control) data.epp_config.flow_control = {};
          setNestedValue(data.epp_config.flow_control, eppKey.slice(21), value);
        }
      } else if (path.indexOf('llm.') === 0) {
        var key = path.slice(4);
        if (key.indexOf('key_policy.') === 0) {
          if (!data.llmConfigData.key_policy)
            data.llmConfigData.key_policy = {};
          data.llmConfigData.key_policy[key.slice(11)] = value;
        } else if (key.indexOf('key_affinity.') === 0) {
          if (!data.llmConfigData.key_affinity)
            data.llmConfigData.key_affinity = {};
          var kaKey = key.slice(13);
          if (kaKey === 'enabled' || kaKey === 'penalty_enable') {
            data.llmConfigData.key_affinity[kaKey] =
              value === 'true' || value === true;
          } else {
            data.llmConfigData.key_affinity[kaKey] = value;
          }
        } else {
          data.llmConfigData[key] = value;
        }
      }
    });

    data.llmConfigData.model_mappings = [];
    root.querySelectorAll('[data-mapping-index]').forEach(function (row) {
      data.llmConfigData.model_mappings.push({
        source_model:
          (row.querySelector('.proto-mapping-key') || {}).value || '',
        target_model:
          (row.querySelector('.proto-mapping-value') || {}).value || '',
      });
    });

    data.llmConfigData.keys = [];
    root.querySelectorAll('[data-key-index]').forEach(function (row) {
      var nameInput = row.querySelector('.proto-key-name');
      var weightInput = row.querySelector('.proto-key-weight');
      data.llmConfigData.keys.push({
        name: nameInput ? nameInput.value : '',
        weight: weightInput
          ? weightInput.value === ''
            ? 0
            : Number(weightInput.value)
          : 0,
      });
    });
  }

  function validateStep0(data, isAdd, clusterNames) {
    var b = data.baseConfigData;
    var name = (b.name || '').trim();
    if (!name) return '请输入集群名称';
    if (!validateClusterNameFormat(name)) {
      return '集群名称格式不正确：1-64个字符，字母或数字开头结尾，允许字母、数字、_、-、.';
    }
    if (isAdd && (clusterNames || []).indexOf(name) !== -1) {
      return '集群名称已存在，请更换名称';
    }
    if (!validateDescription(b.description || '')) {
      return '集群说明长度不能超过 256 个字符，且不能包含控制字符';
    }
    if (
      b.sticky_sessions &&
      b.sticky_sessions.enabled === 'true' &&
      b.sticky_sessions.hash_strategy !== 'CLIENT_IP_ONLY' &&
      !(b.sticky_sessions.hash_header || '').trim()
    ) {
      return '请输入哈希头部';
    }
    var buf = Number(b.buffers && b.buffers.req_write_buffer_size);
    if (!Number.isFinite(buf) || buf <= 0) {
      return '请求写缓存大小须为大于 0 的整数';
    }
    var idle = Number(b.connection && b.connection.max_idle_conn_per_rs);
    if (!Number.isFinite(idle) || idle < 0) {
      return '单个后端最大空闲连接数须为 >=0 的整数';
    }
    return null;
  }

  function validateTimeouts(data) {
    var t = data.baseConfigData.timeouts || {};
    var timeoutFields = [
      ['timeout_read_client_again', '客户端连接空闲超时'],
      ['timeout_readbody_client', '读客户端请求Body超时'],
      ['timeout_conn_serv', '连接后端超时'],
      ['timeout_response_header', '读后端响应头部超时'],
      ['timeout_write_client', '写客户端响应Body超时'],
    ];
    for (var i = 0; i < timeoutFields.length; i++) {
      var val = Number(t[timeoutFields[i][0]]);
      if (!Number.isFinite(val) || val <= 0) {
        return timeoutFields[i][1] + '须为大于 0 的整数';
      }
    }
    var retries = Number(
      data.baseConfigData.retries &&
        data.baseConfigData.retries.max_retry_in_cluster,
    );
    if (!Number.isFinite(retries) || retries < 0) {
      return '同集群重试次数须为 >=0 的整数';
    }
    return null;
  }

  function validateHealth(data) {
    var h = data.passiveHealthData || {};
    var failnum = Number(h.failnum);
    if (!Number.isFinite(failnum) || failnum < 0) {
      return '故障阈值须为 >=0 的整数';
    }
    var interval = Number(h.interval);
    if (!Number.isFinite(interval) || interval < 0) {
      return '健康检查间隔须为 >=0 的整数';
    }
    var uri = (h.uri || '').trim();
    if (!uri || uri.charAt(0) !== '/') {
      return '健康检查 Uri 非空且必须以 / 开头';
    }
    var statuscode = Number(h.statuscode);
    if (
      !Number.isFinite(statuscode) ||
      !(statuscode === 0 || (statuscode >= 100 && statuscode <= 599))
    ) {
      return '健康检查状态码须为 0 或 100-599';
    }
    return null;
  }

  function validateGateway(data) {
    var llm = data.llmConfigData;
    if (!llm.provider) return '请选择所属服务商';
    var provider = getProviderByName(llm.provider);
    if (!provider) return '所选服务商不存在';

    if (llm.strip_prefix) {
      if (!llm.match_prefix || !llm.match_prefix.trim()) {
        return '开启裁剪前缀时，匹配前缀必填';
      }
      if (llm.match_prefix.slice(-1) !== '/') {
        return '匹配前缀必须以 / 结尾';
      }
    }

    if (!llm.models || !llm.models.length) return '请至少选择一个模型';
    var providerModels = provider.models || [];
    for (var i = 0; i < llm.models.length; i++) {
      if (providerModels.indexOf(llm.models[i]) === -1) {
        return '模型 ' + llm.models[i] + ' 不在所属服务商的 models 中';
      }
    }

    var keys = (llm.keys || []).filter(function (k) {
      return k.name && k.name.trim();
    });
    var nameSet = {};
    var providerKeyNames = (provider.keys || []).map(function (item) {
      return item.name;
    });
    for (var j = 0; j < keys.length; j++) {
      var nm = keys[j].name.trim();
      if (providerKeyNames.indexOf(nm) === -1) {
        return 'Key ' + nm + ' 不在所属服务商的 keys 中';
      }
      if (nameSet[nm]) return 'Key 名称不能重复：' + nm;
      nameSet[nm] = true;
      var kw = Number(keys[j].weight);
      if (!Number.isFinite(kw) || kw < 0 || kw > 100) {
        return 'Key 权重须为 0–100';
      }
    }
    if (keys.length > 0) {
      var keyWeightSum = keys.reduce(function (sum, k) {
        return sum + (Number(k.weight) || 0);
      }, 0);
      if (keyWeightSum !== 100) {
        return '所有有效 Key 的权重之和必须等于 100，当前为 ' + keyWeightSum;
      }
    }

    var kp = llm.key_policy || {};
    if (Number(kp.retry_backoff_max) < Number(kp.retry_backoff_initial)) {
      return '最大退避时间必须大于或等于初始退避时间';
    }
    return null;
  }

  function validateEpp(data) {
    if (data.balance_mode !== 'EPP') return null;
    var ec = data.epp_config || {};
    if (
      ec.session_affinity_enabled &&
      !(ec.session_affinity_header || '').trim()
    ) {
      return '会话亲和性启用时，会话亲和性 Header 必填';
    }
    var kvCache = Number(ec.kv_cache_utilization_max);
    if (
      ec.kv_cache_utilization_max != null &&
      (!Number.isFinite(kvCache) || kvCache <= 0 || kvCache > 1)
    ) {
      return 'KV 缓存利用率上限须在 (0, 1] 范围内';
    }
    return null;
  }

  function renderActionButtons(currentStep, reviewStepIndex) {
    return (
      (currentStep === reviewStepIndex
        ? IvuUI.btn(
            '提交',
            'primary',
            'small',
            '',
            'id="cluster-upsert-submit"',
          )
        : IvuUI.btn(
            '下一步',
            'primary',
            'small',
            '',
            'id="cluster-upsert-next"',
          )) +
      (currentStep !== 0
        ? IvuUI.btn(
            '上一步',
            'default',
            'small',
            '',
            'id="cluster-upsert-prev"',
          )
        : '')
    );
  }

  function mount(bodyEl, footerEl, options) {
    options = options || {};
    var state = {
      currentStep: 0,
      isAdd: options.isAdd !== false,
      data: createDefaultData(options.row),
      reviewStepIndex: STEP_DEFS.length - 1,
      clusterNames: options.clusterNames || [],
    };

    function renderStepContent() {
      switch (state.currentStep) {
        case 0:
          return renderBaseConfig(state.data, state.isAdd, state.clusterNames);
        case 1:
          return renderTimeout(state.data);
        case 2:
          return renderPassiveHealth(state.data);
        case 3:
          return renderGatewayConfig(state.data);
        case 4:
          return renderReview(state.data);
        default:
          return '';
      }
    }

    function renderBody() {
      bodyEl.innerHTML =
        '<div class="newClusters">' +
        '<div id="cluster-step-content">' +
        renderStepContent() +
        '</div>' +
        '<footer class="cluster-steps-footer"><div class="ivu-steps ivu-steps-horizontal">' +
        IvuUI.clusterSteps(STEP_DEFS, state.currentStep) +
        '</div></footer></div>';
    }

    function renderFooter() {
      if (!footerEl) return;
      footerEl.innerHTML =
        '<div class="com-btn-box drawer-footer">' +
        renderActionButtons(state.currentStep, state.reviewStepIndex) +
        '</div>';
    }

    function render() {
      renderBody();
      renderFooter();
      bindEvents();
    }

    function bindEvents() {
      var scope = footerEl || bodyEl;
      var nextBtn = scope.querySelector('#cluster-upsert-next');
      if (nextBtn)
        nextBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          var err = null;
          if (state.currentStep === 0) {
            err = validateStep0(state.data, state.isAdd, state.clusterNames);
          } else if (state.currentStep === 1) {
            err = validateTimeouts(state.data);
          } else if (state.currentStep === 2) {
            err = validateHealth(state.data);
          } else if (state.currentStep === 3) {
            err = validateGateway(state.data);
          } else if (state.currentStep === 4) {
            err = validateEpp(state.data);
          }
          if (err) {
            Prototype.toast(err, 'error');
            return;
          }
          state.currentStep += 1;
          render();
        });

      var prevBtn = scope.querySelector('#cluster-upsert-prev');
      if (prevBtn)
        prevBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          state.currentStep -= 1;
          render();
        });

      var submitBtn = scope.querySelector('#cluster-upsert-submit');
      if (submitBtn)
        submitBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          if (typeof options.onSubmit === 'function')
            options.onSubmit(state.data);
        });

      var stickyEnabledSelect = bodyEl.querySelector(
        '[data-field="base.sticky_sessions.enabled"]',
      );
      if (stickyEnabledSelect)
        stickyEnabledSelect.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          render();
        });

      var hashStrategySelect = bodyEl.querySelector(
        '[data-field="base.sticky_sessions.hash_strategy"]',
      );
      if (hashStrategySelect)
        hashStrategySelect.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          render();
        });

      var balanceModeSelect = bodyEl.querySelector(
        '[data-field="epp.balance_mode"]',
      );
      if (balanceModeSelect)
        balanceModeSelect.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          // 切换 WRR/EPP 时，若为 EPP 模式但无 epp_config 则初始化默认值
          if (state.data.balance_mode === 'EPP' && !state.data.epp_config) {
            state.data.epp_config = {
              scheduling_profile: 'balanced',
              cache_affinity: 'medium',
              prefix_cache_affinity: true,
              session_affinity_enabled: false,
              session_affinity_header: '',
              kv_cache_utilization_max: 0.9,
              flow_control: {
                max_requests: null,
                queue_ttl: null,
                no_endpoint_queue_ttl: null,
                enable_eviction: false,
              },
            };
          }
          render();
        });

      var providerSelect = bodyEl.querySelector('#cluster-provider-select');
      if (providerSelect)
        providerSelect.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          var next = getProviderByName(state.data.llmConfigData.provider);
          var nextModels = next && next.models ? next.models : [];
          var prevModels = state.data.llmConfigData.models || [];
          state.data.llmConfigData.models = prevModels.filter(function (model) {
            return nextModels.indexOf(model) !== -1;
          });
          state.data.llmConfigData.keys =
            next && next.keys && next.keys.length
              ? [{ name: next.keys[0].name, weight: 100 }]
              : [{ name: '', weight: 100 }];
          render();
        });

      function bindForwardModelSelect(keepOpen) {
        var wrap = bodyEl.querySelector('.proto-forward-model-select');
        if (!wrap || wrap.classList.contains('ivu-select-disabled')) return;
        var dropdown = wrap.querySelector('.proto-forward-model-dropdown');
        var toggle = wrap.querySelector('.proto-forward-model-toggle');
        if (keepOpen && dropdown) dropdown.style.display = 'block';

        if (toggle) {
          toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            if (e.target.closest('.proto-forward-model-remove')) return;
            if (!dropdown) return;
            dropdown.style.display =
              dropdown.style.display === 'none' ? 'block' : 'none';
          });
        }

        wrap
          .querySelectorAll('.proto-forward-model-option')
          .forEach(function (item) {
            item.addEventListener('click', function (e) {
              e.stopPropagation();
              var value = item.getAttribute('data-value');
              if (!value) return;
              syncFromDom(bodyEl, state.data);
              if (value === '__SELECT_ALL__') {
                var prov = getProviderByName(state.data.llmConfigData.provider);
                state.data.llmConfigData.models =
                  prov && prov.models ? prov.models.slice() : [];
              } else {
                var list = state.data.llmConfigData.models || [];
                var idx = list.indexOf(value);
                if (idx === -1) list.push(value);
                else list.splice(idx, 1);
                state.data.llmConfigData.models = list;
              }
              state.keepForwardModelOpen = true;
              render();
            });
          });

        wrap
          .querySelectorAll('.proto-forward-model-remove')
          .forEach(function (icon) {
            icon.addEventListener('click', function (e) {
              e.stopPropagation();
              var value = icon.getAttribute('data-value');
              syncFromDom(bodyEl, state.data);
              state.data.llmConfigData.models = (
                state.data.llmConfigData.models || []
              ).filter(function (item) {
                return item !== value;
              });
              render();
            });
          });
      }

      if (!bodyEl._fwdModelOutside) {
        bodyEl._fwdModelOutside = function (e) {
          var wrap = bodyEl.querySelector('.proto-forward-model-select');
          if (!wrap || wrap.contains(e.target)) return;
          var dropdown = wrap.querySelector('.proto-forward-model-dropdown');
          if (dropdown) dropdown.style.display = 'none';
        };
        document.addEventListener('click', bodyEl._fwdModelOutside);
      }
      bindForwardModelSelect(!!state.keepForwardModelOpen);
      state.keepForwardModelOpen = false;

      var addMappingBtn = bodyEl.querySelector('#cluster-add-mapping');
      if (addMappingBtn)
        addMappingBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          if (!state.data.llmConfigData.model_mappings)
            state.data.llmConfigData.model_mappings = [];
          state.data.llmConfigData.model_mappings.push({
            source_model: '',
            target_model: '',
          });
          render();
        });

      bodyEl
        .querySelectorAll('[data-action="remove-mapping"]')
        .forEach(function (btn) {
          btn.addEventListener('click', function () {
            syncFromDom(bodyEl, state.data);
            state.data.llmConfigData.model_mappings.splice(
              parseInt(btn.getAttribute('data-index'), 10),
              1,
            );
            render();
          });
        });

      bodyEl
        .querySelectorAll('.proto-mapping-value')
        .forEach(function (select) {
          select.addEventListener('change', function () {
            syncFromDom(bodyEl, state.data);
            var index = parseInt(select.getAttribute('data-index'), 10);
            var mapping = (state.data.llmConfigData.model_mappings || [])[
              index
            ];
            if (!mapping) return;
            mapping.target_model = select.value;
            if (!String(mapping.source_model || '').trim() && select.value) {
              mapping.source_model = select.value;
            }
            render();
          });
        });

      bodyEl.querySelectorAll('.proto-key-name').forEach(function (select) {
        select.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          render();
        });
      });

      var stripPrefixSwitch = bodyEl.querySelector(
        '#proto-strip-prefix-switch',
      );
      if (stripPrefixSwitch)
        stripPrefixSwitch.addEventListener('click', function () {
          state.data.llmConfigData.strip_prefix =
            !state.data.llmConfigData.strip_prefix;
          if (!state.data.llmConfigData.strip_prefix) {
            state.data.llmConfigData.match_prefix = '';
          }
          render();
        });

      // EPP 开关事件绑定
      var eppPrefixCacheSwitch = bodyEl.querySelector(
        '#proto-epp-prefix-cache-switch',
      );
      if (eppPrefixCacheSwitch)
        eppPrefixCacheSwitch.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          if (!state.data.epp_config) state.data.epp_config = {};
          state.data.epp_config.prefix_cache_affinity =
            !state.data.epp_config.prefix_cache_affinity;
          render();
        });

      var eppSessionAffinitySwitch = bodyEl.querySelector(
        '#proto-epp-session-affinity-switch',
      );
      if (eppSessionAffinitySwitch)
        eppSessionAffinitySwitch.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          if (!state.data.epp_config) state.data.epp_config = {};
          state.data.epp_config.session_affinity_enabled =
            !state.data.epp_config.session_affinity_enabled;
          if (!state.data.epp_config.session_affinity_enabled) {
            state.data.epp_config.session_affinity_header = '';
          }
          render();
        });

      var eppEnableEvictionSwitch = bodyEl.querySelector(
        '#proto-epp-enable-eviction-switch',
      );
      if (eppEnableEvictionSwitch)
        eppEnableEvictionSwitch.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          if (!state.data.epp_config) state.data.epp_config = {};
          if (!state.data.epp_config.flow_control)
            state.data.epp_config.flow_control = {};
          state.data.epp_config.flow_control.enable_eviction =
            !state.data.epp_config.flow_control.enable_eviction;
          render();
        });

      var keyAffinitySelect = bodyEl.querySelector(
        '[data-field="llm.key_affinity.enabled"]',
      );
      if (keyAffinitySelect)
        keyAffinitySelect.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          render();
        });

      var keyPenaltySelect = bodyEl.querySelector(
        '[data-field="llm.key_affinity.penalty_enable"]',
      );
      if (keyPenaltySelect)
        keyPenaltySelect.addEventListener('change', function () {
          syncFromDom(bodyEl, state.data);
          render();
        });

      var addKeyBtn = bodyEl.querySelector('#cluster-add-key');
      if (addKeyBtn)
        addKeyBtn.addEventListener('click', function () {
          syncFromDom(bodyEl, state.data);
          if (!state.data.llmConfigData.keys)
            state.data.llmConfigData.keys = [];
          state.data.llmConfigData.keys.push({ name: '', weight: 0 });
          render();
        });

      bodyEl
        .querySelectorAll('[data-action="remove-key"]')
        .forEach(function (btn) {
          btn.addEventListener('click', function () {
            syncFromDom(bodyEl, state.data);
            state.data.llmConfigData.keys.splice(
              parseInt(btn.getAttribute('data-index'), 10),
              1,
            );
            render();
          });
        });
    }

    render();
    return {
      getData: function () {
        return state.data;
      },
    };
  }

  return {
    createDefaultData: createDefaultData,
    renderReview: renderReview,
    mount: mount,
  };
})();
