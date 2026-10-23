window.ApiKeyUpsert = {
  DESCRIPTION_MAX_LENGTH: 512,
  MAX_RULES: 3,
  WINDOW_MIN_MINUTES: 1,
  WINDOW_MAX_MINUTES: 360,
  RMB_QUOTA_MAX: 90000000,
  TOKEN_QUOTA_MAX: 9999999999,
  INT64_MAX: 9223372036854775807,
  RATE_LIMIT_NAME_RE: /^[a-zA-Z0-9_-]{1,128}$/,
  // 批量限流（batch_limits）维度：编辑/回显、校验、提交组装共用
  BATCH_LIMIT_FIELDS: [
    {
      key: 'max_create_rpm',
      id: 'api-batch-max-create-rpm',
      label: '批量任务创建RPM',
    },
    {
      key: 'max_active_batches',
      id: 'api-batch-max-active-batches',
      label: '在途批量任务上限',
    },
    {
      key: 'max_file_bytes',
      id: 'api-batch-max-file-bytes',
      label: '单文件字节上限',
    },
    {
      key: 'max_file_lines',
      id: 'api-batch-max-file-lines',
      label: '单文件行数上限',
    },
  ],

  quotaMax(isRMB) {
    return isRMB ? ApiKeyUpsert.RMB_QUOTA_MAX : ApiKeyUpsert.TOKEN_QUOTA_MAX;
  },

  quotaInputAttrs(isRMB) {
    return (
      (isRMB ? 'step="0.0001" ' : 'step="1" ') +
      'min="0" max="' +
      ApiKeyUpsert.quotaMax(isRMB) +
      '"'
    );
  },

  applyQuotaInputLimits(input, isRMB) {
    if (!input) return;
    input.step = isRMB ? '0.0001' : '1';
    input.min = '0';
    input.max = String(ApiKeyUpsert.quotaMax(isRMB));
    var num = Number(input.value);
    if (Number.isFinite(num) && num > ApiKeyUpsert.quotaMax(isRMB)) {
      input.value = ApiKeyUpsert.quotaMax(isRMB);
    }
  },

  validateQuotaValue(value, isRMB) {
    if (value === '' || value == null) return '请输入配额总量';
    var num = Number(value);
    if (!Number.isFinite(num) || num < 0) return '配额总量不能为负数';
    if (isRMB) {
      if (num > ApiKeyUpsert.RMB_QUOTA_MAX) return '配额总量超出允许范围';
      var dec = (String(value).split('.')[1] || '').length;
      if (dec > 4) return 'RMB 配额最多保留 4 位小数';
      return null;
    }
    if (!Number.isInteger(num)) return 'total_token 配额必须为整数';
    if (num > ApiKeyUpsert.TOKEN_QUOTA_MAX) return '配额总量超出允许范围';
    return null;
  },

  validateRateLimitRuleName(name) {
    var val = String(name || '').trim();
    if (!val) return '请输入规则名称';
    if (val.length > 128) return '规则名称长度须为 1–128 字符';
    if (!ApiKeyUpsert.RATE_LIMIT_NAME_RE.test(val)) {
      return '规则名称仅允许字母、数字、下划线、连字符';
    }
    return null;
  },

  suggestRateLimitRuleName(type, existingNames) {
    var base = type === 'tpm' ? 'tpm_1min' : 'rpm_1min';
    var names = existingNames || {};
    if (!names[base]) return base;
    for (var i = 2; i <= 99; i++) {
      var candidate = base + '_' + i;
      if (!names[candidate]) return candidate;
    }
    return base + '_' + Date.now();
  },

  collectRateLimitRuleNames(root) {
    var names = {};
    (root || document).querySelectorAll('.rule-name-input').forEach(function (input) {
      var val = String(input.value || '').trim();
      if (val) names[val] = true;
    });
    return names;
  },

  validateBatchLimitValue(value, label) {
    if (value === '' || value == null) return null;
    var num = Number(value);
    if (!Number.isFinite(num) || num < 0) return label + '不能为负数';
    return null;
  },

  bindBatchLimitInputs() {
    ApiKeyUpsert.BATCH_LIMIT_FIELDS.forEach(function (f) {
      var input = document.getElementById(f.id);
      if (!input) return;
      input.addEventListener('blur', function () {
        var err = ApiKeyUpsert.validateBatchLimitValue(input.value, f.label);
        if (err) {
          input.classList.add('ivu-input-error');
          Prototype.toast(err, 'error');
        } else {
          input.classList.remove('ivu-input-error');
        }
      });
    });
  },

  validateBatchLimitsForm() {
    var firstErr = null;
    ApiKeyUpsert.BATCH_LIMIT_FIELDS.forEach(function (f) {
      var input = document.getElementById(f.id);
      if (!input) return;
      var err = ApiKeyUpsert.validateBatchLimitValue(input.value, f.label);
      if (err) {
        input.classList.add('ivu-input-error');
        if (!firstErr) firstErr = err;
      } else {
        input.classList.remove('ivu-input-error');
      }
    });
    return firstErr;
  },

  // 提交组装：读取批量限流表单，返回 rate_limit_policy.rules.batch_limits 子对象；
  // 留空或为 0 的维度不提交，全部未配置时返回 null（省略整个 batch_limits 对象）
  collectBatchLimits() {
    var result = null;
    ApiKeyUpsert.BATCH_LIMIT_FIELDS.forEach(function (f) {
      var input = document.getElementById(f.id);
      if (!input) return;
      var raw = input.value;
      if (raw === '' || raw == null) return;
      var num = Number(raw);
      if (!Number.isFinite(num) || num <= 0) return;
      if (!result) result = {};
      result[f.key] = num;
    });
    return result;
  },

  renderBatchLimitsDetail(batchLimits) {
    batchLimits = batchLimits || {};
    var lines = [];
    ApiKeyUpsert.BATCH_LIMIT_FIELDS.forEach(function (f) {
      var v = batchLimits[f.key];
      if (v !== undefined && v !== null && Number(v) > 0) {
        lines.push(f.label + '：' + v);
      }
    });
    if (!lines.length) return '';
    return (
      '<div class="rules-detail">' +
      '<div class="rules-detail-title">批量限流 (' +
      lines.length +
      '项)</div>' +
      '<div class="rule-detail-item">' +
      lines
        .map(function (l) {
          return '<div>' + l + '</div>';
        })
        .join('') +
      '</div>' +
      '</div>'
    );
  },

  maskKey(key) {
    if (!key) return '-';
    if (key.length <= 12) return key;
    return key.substring(0, 8) + '****' + key.substring(key.length - 4);
  },

  formatNumber(num, decimals) {
    num = Number(num) || 0;
    if (decimals == null) decimals = 0;
    if (decimals === 0) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return String(num);
    }
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  isRMB(row) {
    return row && row.quota_plan && row.quota_plan.unit === 'RMB';
  },

  formatQuota(row) {
    if (row.unlimited_quota || (row.quota_plan && row.quota_plan.unlimited))
      return '-';
    var plan = row.quota_plan || {};
    var used = (plan.balance && plan.balance.used) || 0;
    var quota = plan.quota || 0;
    var isRMB = ApiKeyUpsert.isRMB(row);
    var decimals = isRMB ? 4 : 0;
    var prefix = isRMB ? '¥' : '';
    var suffix = isRMB ? '' : ' tokens';
    return (
      prefix +
      ApiKeyUpsert.formatNumber(used, decimals) +
      ' / ' +
      prefix +
      ApiKeyUpsert.formatNumber(quota, decimals) +
      suffix
    );
  },

  formatTime(timestamp) {
    if (!timestamp) return '-';
    var date = new Date(timestamp * 1000);
    var pad = function (n) {
      return n < 10 ? '0' + n : n;
    };
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      ' ' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes()) +
      ':' +
      pad(date.getSeconds())
    );
  },

  formatExpiredTime(expiredTime) {
    if (
      expiredTime === -1 ||
      expiredTime === null ||
      expiredTime === undefined ||
      expiredTime === 0
    ) {
      return '永不过期';
    }
    return ApiKeyUpsert.formatTime(expiredTime);
  },

  isCidr(cidr) {
    if (!cidr || typeof cidr !== 'string') return false;
    var parts = cidr.split('/');
    if (parts.length !== 2) return false;
    var ip = parts[0];
    var prefix = parseInt(parts[1], 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    var octets = ip.split('.');
    if (octets.length !== 4) return false;
    for (var i = 0; i < 4; i++) {
      var octet = parseInt(octets[i], 10);
      if (isNaN(octet) || octet < 0 || octet > 255) return false;
    }
    return true;
  },

  ipToLong(ip) {
    var octets = ip.split('.').map(Number);
    return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
  },

  cidrToRange(cidr) {
    var parts = cidr.split('/');
    var ipLong = ApiKeyUpsert.ipToLong(parts[0]);
    var prefix = parseInt(parts[1], 10);
    var mask = prefix === 0 ? 0 : 0xffffffff << (32 - prefix);
    var network = ipLong & mask;
    var broadcast = network | (~mask >>> 0);
    return { start: network >>> 0, end: broadcast >>> 0 };
  },

  isCidrEqual(cidr1, cidr2) {
    var r1 = ApiKeyUpsert.cidrToRange(cidr1);
    var r2 = ApiKeyUpsert.cidrToRange(cidr2);
    return r1.start === r2.start && r1.end === r2.end;
  },

  isCidrContained(innerCidr, outerCidr) {
    var r1 = ApiKeyUpsert.cidrToRange(innerCidr);
    var r2 = ApiKeyUpsert.cidrToRange(outerCidr);
    return (
      r1.start >= r2.start &&
      r1.end <= r2.end &&
      (r1.start !== r2.start || r1.end !== r2.end)
    );
  },

  parseSubnets(text) {
    if (!text) return ['*'];
    var lines = String(text)
      .split('\n')
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s !== '';
      });
    return lines.length > 0 ? lines : ['*'];
  },

  rowSpan2(content) {
    return '<div class="api-key-form-grid">' + content + '</div>';
  },

  col(content) {
    return '<div class="api-key-form-col">' + content + '</div>';
  },

  renderUpsertBody(data, isAdd) {
    data = data || {};
    var plan = data.quota_plan || {
      unlimited: 'true',
      quota: 0,
      unit: 'total_token',
      reset_period: 'never',
      pass_when_no_enough_quota: 'false',
    };
    var policy = data.rate_limit_policy || {
      enabled: 'false',
      rules: { max_concurrency: -1, tpm: [], rpm: [] },
    };
    var enabled = data.enabled !== false && data.enabled !== 'false';
    var unlimitedQuota =
      data.unlimited_quota === true || data.unlimited_quota === 'true';
    var rateEnabled = policy.enabled === true || policy.enabled === 'true';
    var planLimited = plan.unlimited === false || plan.unlimited === 'false';
    var maxConc = policy.rules && policy.rules.max_concurrency;
    var maxMode =
      maxConc === 0 ? 'banned' : maxConc > 0 ? 'limited' : 'unlimited';
    var entities = (MockData.entities || []).map(function (e) {
      return e.name + ' (' + e.type + ')';
    });
    var entityNames = (MockData.entities || []).map(function (e) {
      return e.name + ' (' + e.type + ')';
    });
    var tpmRules = (policy.rules && policy.rules.tpm) || [];
    var rpmRules = (policy.rules && policy.rules.rpm) || [];
    var batchLimits = (policy.rules && policy.rules.batch_limits) || null;
    var models =
      data.models && data.models.length ? data.models.slice() : ['*'];
    var expiredTime = data.expire_time;
    var neverExpire =
      expiredTime === -1 ||
      expiredTime === null ||
      expiredTime === undefined ||
      expiredTime === 0;
    var expiredDateStr = '';
    if (!neverExpire && expiredTime) {
      var d = new Date(expiredTime * 1000);
      var pad = function (n) {
        return n < 10 ? '0' + n : n;
      };
      expiredDateStr =
        d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
    var subnetText = '*';
    if (data.subnet) {
      if (Array.isArray(data.subnet)) {
        subnetText = data.subnet.join('\n');
      } else {
        subnetText = data.subnet;
      }
    }

    return (
      '<form class="ivu-form ivu-form-label-top api-key-upsert-form">' +
      IvuUI.card(
        '基本信息',
        IvuUI.formTopItem(
          '描述',
          '<div class="ivu-input-wrapper ivu-input-type-text">' +
            '<input type="text" id="api-desc" class="ivu-input" value="' +
            IvuUI.escapeHtml(data.description || '') +
            '" placeholder="请输入API-Key描述" maxlength="512" />' +
            '</div>' +
            '<p class="form-tip" id="api-desc-count">' +
            (data.description ? data.description.length : 0) +
            '/512</p>',
          true,
        ) +
          ApiKeyUpsert.rowSpan2(
            ApiKeyUpsert.col(
              IvuUI.formTopItem(
                '过期时间',
                '<label class="api-key-checkbox-line">' +
                  '<input type="checkbox" id="api-never-expire" ' +
                  (neverExpire ? 'checked' : '') +
                  ' /> 永不过期' +
                  '</label>' +
                  '<div id="api-expire-date-wrap" class="' +
                  (neverExpire ? 'proto-hidden-inline' : '') +
                  '" style="margin-top:8px;">' +
                  '<input type="date" id="api-expire-date" class="ivu-input" value="' +
                  expiredDateStr +
                  '" style="width:210px;" />' +
                  '</div>',
              ),
            ) + ApiKeyUpsert.col(''),
          ) +
          ApiKeyUpsert.rowSpan2(
            ApiKeyUpsert.col(
              IvuUI.formTopItem(
                '启用状态',
                ApiKeyUpsert.nativeSelect(
                  'api-enabled',
                  ['true', 'false'],
                  enabled ? 'true' : 'false',
                  ['启用', '停用'],
                ),
              ),
            ) +
              ApiKeyUpsert.col(
                IvuUI.formTopItem(
                  '执行配额检查',
                  ApiKeyUpsert.nativeSelect(
                    'api-quota-check',
                    ['false', 'true'],
                    unlimitedQuota ? 'true' : 'false',
                    ['是', '否'],
                  ),
                ),
              ),
          ) +
          ApiKeyUpsert.rowSpan2(
            ApiKeyUpsert.col(
              IvuUI.formTopItem(
                '允许模型',
                ApiKeyUpsert.renderModelsMultiSelect(models),
              ),
            ) +
              ApiKeyUpsert.col(
                IvuUI.formTopItem(
                  '允许子网',
                  '<div class="ivu-input-wrapper ivu-input-type-textarea">' +
                    '<textarea id="api-subnet" class="ivu-input" rows="3" placeholder="默认&quot;*&quot;表示不限制">' +
                    IvuUI.escapeHtml(subnetText) +
                    '</textarea></div>' +
                    '<p class="form-tip" id="api-subnet-tip">多个网段用换行分隔，默认为*表示不限制</p>',
                ),
              ),
          ) +
          ApiKeyUpsert.rowSpan2(
            ApiKeyUpsert.col(
              IvuUI.formTopItem(
                '挂载Entity',
                ApiKeyUpsert.nativeSelect(
                  'api-entity',
                  entityNames,
                  (data.entity &&
                    data.entity.name + ' (' + data.entity.type + ')') ||
                    entityNames[0] ||
                    '',
                  entityNames,
                ),
              ),
            ),
          ),
      ) +
      IvuUI.card(
        '配额信息',
        ApiKeyUpsert.rowSpan2(
          ApiKeyUpsert.col(
            IvuUI.formTopItem(
              '无限配额',
              ApiKeyUpsert.nativeSelect(
                'api-plan-unlimited',
                ['true', 'false'],
                planLimited ? 'false' : 'true',
                ['是', '否'],
              ),
            ),
          ),
        ) + ApiKeyUpsert.renderQuotaDetails(plan, planLimited),
      ) +
      IvuUI.card(
        '限流配置',
        ApiKeyUpsert.rowSpan2(
          ApiKeyUpsert.col(
            IvuUI.formTopItem(
              '<span class="rate-limit-label">启用限流' +
                '<span class="rate-limit-help-icon" title="启用后可配置TPM、RPM和最大并发限流规则">&#9432;</span>' +
                '</span>',
              ApiKeyUpsert.nativeSelect(
                'api-rate-enabled',
                ['true', 'false'],
                rateEnabled ? 'true' : 'false',
                ['是', '否'],
              ),
            ),
          ),
        ) +
          '<div id="api-rate-details"' +
          (rateEnabled ? '' : ' class="proto-hidden-inline"') +
          '>' +
          ApiKeyUpsert.renderRateLimitRules(
            tpmRules,
            rpmRules,
            maxMode,
            maxConc,
            isAdd,
            batchLimits,
          ) +
          '</div>',
      ) +
      '<div id="api-form-error" class="proto-form-error-tip" style="color:#ed4014;margin-top:8px;font-size:12px;"></div>' +
      '</form>'
    );
  },

  renderQuotaDetails(plan, visible) {
    plan = plan || {};
    var isRMB = plan.unit === 'RMB';
    var quotaValue = plan.quota != null ? plan.quota : 1000000;
    return (
      '<div id="api-quota-details"' +
      (visible ? '' : ' class="proto-hidden-inline"') +
      '>' +
      ApiKeyUpsert.rowSpan2(
        ApiKeyUpsert.col(
          IvuUI.formTopItem(
            '配额不足时放行',
            ApiKeyUpsert.nativeSelect(
              'api-pass-no-quota',
              ['true', 'false'],
              'false',
              ['是', '否'],
            ),
          ),
        ) +
          ApiKeyUpsert.col(
            IvuUI.formTopItem(
              '配额总量',
              IvuUI.inputNumber(
                quotaValue,
                'id="api-quota-total" style="width:100%" ' +
                  ApiKeyUpsert.quotaInputAttrs(isRMB),
              ),
            ),
          ),
      ) +
      ApiKeyUpsert.rowSpan2(
        ApiKeyUpsert.col(
          IvuUI.formTopItem(
            '配额单位',
            ApiKeyUpsert.nativeSelect(
              'api-quota-unit',
              ['total_token', 'RMB'],
              plan.unit || 'total_token',
              ['total_token', 'RMB'],
            ),
          ),
        ) +
          ApiKeyUpsert.col(
            IvuUI.formTopItem(
              '重置周期',
              ApiKeyUpsert.nativeSelect(
                'api-reset-period',
                ['never', 'weekly', 'monthly'],
                plan.reset_period || 'monthly',
                ['永不重置', '每周', '每月'],
              ),
            ),
          ),
      ) +
      '</div>'
    );
  },

  formatModelsText(models) {
    models = models || [];
    if (!models.length || models.indexOf('*') >= 0) return '全部模型';
    return models.join(', ');
  },

  renderModelsMultiSelect(models, options) {
    options = options || {};
    var rootId = options.rootId || 'api-models-select';
    var includeAll = options.includeAll !== false;
    var placeholder = options.placeholder || '请选择模型';
    models = models && models.length ? models.slice() : includeAll ? ['*'] : [];
    if (includeAll && models.indexOf('*') >= 0) models = ['*'];
    var groups = MockData.modelGroups || [];
    var optionsHtml = includeAll
      ? '<div class="proto-el-multiselect-option" data-value="*">全部模型</div>'
      : '';
    groups.forEach(function (group) {
      optionsHtml +=
        '<div class="proto-el-multiselect-group">' +
        IvuUI.escapeHtml(group.label) +
        '</div>';
      (group.models || []).forEach(function (model) {
        optionsHtml +=
          '<div class="proto-el-multiselect-option" data-value="' +
          IvuUI.escapeHtml(model) +
          '">' +
          IvuUI.escapeHtml(model) +
          '</div>';
      });
    });
    return (
      '<div class="proto-el-multiselect" id="' +
      rootId +
      '" data-selected="' +
      IvuUI.escapeHtml(JSON.stringify(models)) +
      '" data-include-all="' +
      (includeAll ? 'true' : 'false') +
      '">' +
      '<div class="proto-el-multiselect-trigger">' +
      '<div class="proto-el-multiselect-tags"></div>' +
      '<span class="proto-el-multiselect-placeholder">' +
      IvuUI.escapeHtml(placeholder) +
      '</span>' +
      '<span class="proto-el-multiselect-arrow">▾</span>' +
      '</div>' +
      '<div class="proto-el-multiselect-dropdown proto-hidden">' +
      optionsHtml +
      '</div>' +
      '</div>'
    );
  },

  initModelsMultiSelect(rootId) {
    var root = document.getElementById(rootId || 'api-models-select');
    if (!root) return;

    var includeAll = root.getAttribute('data-include-all') !== 'false';
    var selected = [];
    try {
      selected = JSON.parse(
        root.getAttribute('data-selected') || (includeAll ? '["*"]' : '[]'),
      );
    } catch (err) {
      selected = includeAll ? ['*'] : [];
    }
    if (includeAll) {
      if (!selected.length) selected = ['*'];
      if (selected.indexOf('*') >= 0) selected = ['*'];
    }

    var dropdown = root.querySelector('.proto-el-multiselect-dropdown');
    var tagsEl = root.querySelector('.proto-el-multiselect-tags');
    var placeholder = root.querySelector('.proto-el-multiselect-placeholder');
    var trigger = root.querySelector('.proto-el-multiselect-trigger');

    function getLabel(value) {
      return value === '*' ? '全部模型' : value;
    }

    function persist() {
      root.setAttribute('data-selected', JSON.stringify(selected));
    }

    function renderTags() {
      tagsEl.innerHTML = selected
        .map(function (val) {
          return (
            '<span class="proto-el-tag" data-value="' +
            IvuUI.escapeHtml(val) +
            '">' +
            IvuUI.escapeHtml(getLabel(val)) +
            '<span class="proto-el-tag-close" data-remove="' +
            IvuUI.escapeHtml(val) +
            '">×</span></span>'
          );
        })
        .join('');
      placeholder.style.display = selected.length ? 'none' : 'inline';
      root
        .querySelectorAll('.proto-el-multiselect-option')
        .forEach(function (opt) {
          opt.classList.toggle(
            'is-selected',
            selected.indexOf(opt.getAttribute('data-value')) !== -1,
          );
        });
      persist();
    }

    function closeDropdown() {
      dropdown.classList.add('proto-hidden');
      root.classList.remove('is-open');
    }

    function openDropdown() {
      dropdown.classList.remove('proto-hidden');
      root.classList.add('is-open');
    }

    function toggleModel(value) {
      var idx = selected.indexOf(value);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else if (includeAll && value === '*') {
        selected = ['*'];
      } else if (includeAll) {
        selected = selected.filter(function (v) {
          return v !== '*';
        });
        selected.push(value);
      } else {
        selected.push(value);
      }
      if (includeAll && !selected.length) selected = ['*'];
      renderTags();
    }

    trigger.onclick = function (e) {
      if (e.target.closest('.proto-el-tag-close')) return;
      e.stopPropagation();
      if (dropdown.classList.contains('proto-hidden')) openDropdown();
      else closeDropdown();
    };

    root
      .querySelectorAll('.proto-el-multiselect-option')
      .forEach(function (opt) {
        opt.onclick = function (e) {
          e.stopPropagation();
          toggleModel(opt.getAttribute('data-value'));
          if (includeAll && opt.getAttribute('data-value') === '*')
            closeDropdown();
        };
      });

    tagsEl.onclick = function (e) {
      var closeBtn = e.target.closest('.proto-el-tag-close');
      if (!closeBtn) return;
      e.stopPropagation();
      var val = closeBtn.getAttribute('data-remove');
      selected = selected.filter(function (v) {
        return v !== val;
      });
      if (includeAll && !selected.length) selected = ['*'];
      renderTags();
    };

    if (!window._protoModelsOutsideClickBound) {
      window._protoModelsOutsideClickBound = true;
      document.addEventListener('mousedown', function (e) {
        document
          .querySelectorAll('.proto-el-multiselect.is-open')
          .forEach(function (el) {
            if (el.contains(e.target)) return;
            var panel = el.querySelector('.proto-el-multiselect-dropdown');
            if (panel) panel.classList.add('proto-hidden');
            el.classList.remove('is-open');
          });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        document
          .querySelectorAll('.proto-el-multiselect.is-open')
          .forEach(function (el) {
            var panel = el.querySelector('.proto-el-multiselect-dropdown');
            if (panel) panel.classList.add('proto-hidden');
            el.classList.remove('is-open');
          });
      });
    }

    closeDropdown();
    renderTags();
  },

  initUpsertForm() {
    function toggle(el, show) {
      if (!el) return;
      el.classList.toggle('proto-hidden-inline', !show);
    }

    function showError(msg) {
      var errEl = document.getElementById('api-form-error');
      if (errEl) errEl.textContent = msg || '';
    }

    // 描述字数统计与校验
    var descInput = document.getElementById('api-desc');
    var descCount = document.getElementById('api-desc-count');
    if (descInput && descCount) {
      descInput.addEventListener('input', function () {
        var len = descInput.value.length;
        descCount.textContent = len + '/512';
        if (len > ApiKeyUpsert.DESCRIPTION_MAX_LENGTH) {
          descCount.style.color = '#ed4014';
        } else {
          descCount.style.color = '';
        }
      });
    }

    // 过期时间交互
    var neverExpireCb = document.getElementById('api-never-expire');
    var expireDateWrap = document.getElementById('api-expire-date-wrap');
    if (neverExpireCb && expireDateWrap) {
      neverExpireCb.addEventListener('change', function () {
        toggle(expireDateWrap, !neverExpireCb.checked);
      });
    }

    // 配额详情显示
    var planSelect = document.getElementById('api-plan-unlimited');
    if (planSelect) {
      var syncQuota = function () {
        toggle(
          document.getElementById('api-quota-details'),
          planSelect.value === 'false',
        );
      };
      planSelect.onchange = syncQuota;
      syncQuota();
    }

    // 配额单位切换
    var quotaUnitSelect = document.getElementById('api-quota-unit');
    var quotaTotalInput = document.getElementById('api-quota-total');
    if (quotaUnitSelect && quotaTotalInput) {
      quotaUnitSelect.addEventListener('change', function () {
        ApiKeyUpsert.applyQuotaInputLimits(
          quotaTotalInput,
          quotaUnitSelect.value === 'RMB',
        );
      });
    }

    // 限流详情显示
    var rateSelect = document.getElementById('api-rate-enabled');
    if (rateSelect) {
      var syncRate = function () {
        toggle(
          document.getElementById('api-rate-details'),
          rateSelect.value === 'true',
        );
      };
      rateSelect.onchange = syncRate;
      syncRate();
    }

    // 最大并发模式
    var maxModeSelect = document.getElementById('api-max-concurrency-mode');
    if (maxModeSelect) {
      var syncMaxConc = function () {
        toggle(
          document.getElementById('api-max-concurrency-input'),
          maxModeSelect.value === 'limited',
        );
      };
      maxModeSelect.onchange = syncMaxConc;
      syncMaxConc();
    }

    // 添加 TPM 规则
    var addTpmBtn = document.getElementById('btn-add-tpm-rule');
    if (addTpmBtn) {
      addTpmBtn.addEventListener('click', function () {
        var section = document.getElementById('tpm-rules-section');
        if (!section) return;
        var rows = section.querySelectorAll('.rule-row');
        if (rows.length >= ApiKeyUpsert.MAX_RULES) {
          Prototype.toast(
            '最多只能添加 ' + ApiKeyUpsert.MAX_RULES + ' 条 TPM 规则',
          );
          return;
        }
        var newRule = {
          name: ApiKeyUpsert.suggestRateLimitRuleName(
            'tpm',
            ApiKeyUpsert.collectRateLimitRuleNames(section),
          ),
          model: '*',
          window_minutes: 1,
          max_tokens: 10000,
          step_minutes: 1,
        };
        var actionsEl = section.querySelector('.rules-section-actions');
        if (actionsEl) {
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = ApiKeyUpsert.ruleRow('tpm', newRule, rows.length, false);
          var newRow = tempDiv.firstElementChild;
          actionsEl.parentNode.insertBefore(newRow, actionsEl);
          ApiKeyUpsert.bindRuleRowEvents(newRow, 'tpm');
          if (rows.length + 1 >= ApiKeyUpsert.MAX_RULES) {
            addTpmBtn.disabled = true;
            addTpmBtn.classList.remove('ivu-btn-primary');
            addTpmBtn.classList.add('ivu-btn-default', 'proto-btn-disabled');
          }
        }
      });
    }

    // 添加 RPM 规则
    var addRpmBtn = document.getElementById('btn-add-rpm-rule');
    if (addRpmBtn) {
      addRpmBtn.addEventListener('click', function () {
        var section = document.getElementById('rpm-rules-section');
        if (!section) return;
        var rows = section.querySelectorAll('.rule-row');
        if (rows.length >= ApiKeyUpsert.MAX_RULES) {
          Prototype.toast(
            '最多只能添加 ' + ApiKeyUpsert.MAX_RULES + ' 条 RPM 规则',
          );
          return;
        }
        var newRule = {
          name: ApiKeyUpsert.suggestRateLimitRuleName(
            'rpm',
            ApiKeyUpsert.collectRateLimitRuleNames(section),
          ),
          model: '*',
          window_minutes: 1,
          max_requests: 100,
        };
        var actionsEl = section.querySelector('.rules-section-actions');
        if (actionsEl) {
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = ApiKeyUpsert.ruleRow('rpm', newRule, rows.length, false);
          var newRow = tempDiv.firstElementChild;
          actionsEl.parentNode.insertBefore(newRow, actionsEl);
          ApiKeyUpsert.bindRuleRowEvents(newRow, 'rpm');
          if (rows.length + 1 >= ApiKeyUpsert.MAX_RULES) {
            addRpmBtn.disabled = true;
            addRpmBtn.classList.remove('ivu-btn-primary');
            addRpmBtn.classList.add('ivu-btn-default', 'proto-btn-disabled');
          }
        }
      });
    }

    // 为已有规则行绑定删除事件
    document
      .querySelectorAll('#tpm-rules-section .rule-row')
      .forEach(function (row) {
        ApiKeyUpsert.bindRuleRowEvents(row, 'tpm');
      });
    document
      .querySelectorAll('#rpm-rules-section .rule-row')
      .forEach(function (row) {
        ApiKeyUpsert.bindRuleRowEvents(row, 'rpm');
      });

    // 子网 CIDR 校验
    var subnetTextarea = document.getElementById('api-subnet');
    var subnetTip = document.getElementById('api-subnet-tip');
    if (subnetTextarea && subnetTip) {
      var validateSubnet = function () {
        var subnets = ApiKeyUpsert.parseSubnets(subnetTextarea.value);
        var tip = '';
        var tipClass = 'form-tip';
        if (subnets.length === 0) {
          tip = '请输入允许子网';
          tipClass += ' form-tip-error';
        } else if (subnets.includes('*') && subnets.length > 1) {
          tip = '* 与其他网段不能同时使用';
          tipClass += ' form-tip-error';
        } else {
          for (var i = 0; i < subnets.length; i++) {
            var cidr = subnets[i];
            if (cidr === '*') continue;
            if (!ApiKeyUpsert.isCidr(cidr)) {
              tip = '第' + (i + 1) + '行子网格式错误：' + cidr;
              tipClass += ' form-tip-error';
              break;
            }
            for (var j = 0; j < subnets.length; j++) {
              if (i === j) continue;
              var other = subnets[j];
              if (other === '*') continue;
              if (ApiKeyUpsert.isCidrEqual(cidr, other)) {
                tip = '子网重复：' + cidr;
                tipClass += ' form-tip-error';
                i = subnets.length;
                break;
              }
              if (ApiKeyUpsert.isCidrContained(cidr, other)) {
                tip = '子网 ' + cidr + ' 被 ' + other + ' 包含';
                tipClass += ' form-tip-error';
                i = subnets.length;
                break;
              }
              if (ApiKeyUpsert.isCidrContained(other, cidr)) {
                tip = '子网 ' + cidr + ' 包含 ' + other;
                tipClass += ' form-tip-error';
                i = subnets.length;
                break;
              }
            }
          }
        }
        if (!tip) {
          tip = '多个网段用换行分隔，默认为*表示不限制';
        }
        subnetTip.textContent = tip;
        subnetTip.className = tipClass;
        return !tipClass.includes('form-tip-error');
      };
      subnetTextarea.addEventListener('blur', validateSubnet);
      subnetTextarea._validateSubnet = validateSubnet;
    }

    ApiKeyUpsert.initModelsMultiSelect();
  },

  bindRuleRowEvents(row, type) {
    var delBtn = row.querySelector('.rule-delete-btn');
    if (!delBtn) return;
    var nameInput = row.querySelector('.rule-name-input');
    if (nameInput && !nameInput.readOnly) {
      nameInput.addEventListener('blur', function () {
        var err = ApiKeyUpsert.validateRateLimitRuleName(nameInput.value);
        if (err) {
          nameInput.classList.add('ivu-input-error');
          Prototype.toast(err, 'error');
        } else {
          nameInput.classList.remove('ivu-input-error');
        }
      });
    }
    delBtn.addEventListener('click', function () {
      var section =
        row.closest('#tpm-rules-section') || row.closest('#rpm-rules-section');
      if (!section) return;
      var addBtn =
        section.querySelector('#btn-add-tpm-rule') ||
        section.querySelector('#btn-add-rpm-rule');
      row.parentNode.removeChild(row);
      // 重新编号
      var rows = section.querySelectorAll('.rule-row');
      rows.forEach(function (r, i) {
        r.setAttribute('data-rule-index', i);
      });
      // 恢复添加按钮
      if (addBtn && rows.length < ApiKeyUpsert.MAX_RULES) {
        addBtn.disabled = false;
        addBtn.classList.remove('ivu-btn-default', 'proto-btn-disabled');
        addBtn.classList.add('ivu-btn-primary');
      }
    });
    // TPM 步长不超过窗口
    if (type === 'tpm') {
      var windowInput = row.querySelector('.rule-window-input');
      var stepInput = row.querySelector('.rule-step-input');
      if (windowInput && stepInput) {
        windowInput.addEventListener('change', function () {
          var winVal = parseInt(windowInput.value, 10);
          var stepVal = parseInt(stepInput.value, 10);
          if (winVal > 0 && stepVal > winVal) {
            stepInput.value = winVal;
          }
        });
        stepInput.addEventListener('change', function () {
          var winVal = parseInt(windowInput.value, 10);
          var stepVal = parseInt(stepInput.value, 10);
          if (winVal > 0 && stepVal > winVal) {
            stepInput.value = winVal;
          }
        });
      }
    }
  },

  ruleRow(type, rule, index, nameReadonly) {
    var isTpm = type === 'tpm';
    var readonly = !!nameReadonly && !!(rule.name && String(rule.name).trim());
    var nameAttrs =
      ' type="text" class="ivu-input rule-name-input" value="' +
      IvuUI.escapeHtml(rule.name || '') +
      '" placeholder="tpm_1min / rpm_1min"' +
      (readonly ? ' readonly disabled' : '');
    var modelSelect = ApiKeyUpsert.nativeSelect(
      '',
      ['*', 'gpt-4o'],
      rule.model || '*',
      ['全部模型', 'gpt-4o'],
    );
    var fields =
      ApiKeyUpsert.ruleField(
        IvuUI.formTopItem(
          '规则名称',
          '<input' +
            nameAttrs +
            ' />' +
            (readonly
              ? '<p class="form-tip">创建后不可修改</p>'
              : '<p class="form-tip">字符集 [a-zA-Z0-9_-]，1–128 字符</p>'),
        ),
      ) +
      ApiKeyUpsert.ruleField(IvuUI.formTopItem('适用模型', modelSelect)) +
      ApiKeyUpsert.ruleField(
        IvuUI.formTopItem(
          '时间窗口(分)',
          IvuUI.inputNumber(
            rule.window_minutes || 1,
            'class="rule-window-input" style="width:100%"',
          ),
        ),
      ) +
      ApiKeyUpsert.ruleField(
        IvuUI.formTopItem(
          isTpm ? '最大Token数' : '最大请求数',
          IvuUI.inputNumber(
            isTpm ? rule.max_tokens || 100000 : rule.max_requests || 1000,
            'class="' +
              (isTpm ? 'rule-maxtokens-input' : 'rule-maxrequests-input') +
              '" style="width:100%"',
          ),
        ),
      );
    if (isTpm) {
      fields += ApiKeyUpsert.ruleField(
        IvuUI.formTopItem(
          '滑动步长(分)',
          IvuUI.inputNumber(
            rule.step_minutes || 1,
            'class="rule-step-input" style="width:100%"',
          ),
        ),
      );
    }
    fields += ApiKeyUpsert.ruleField(
      IvuUI.formTopItem(
        '操作',
        IvuUI.btn(
          '删除',
          'error',
          'small',
          '',
          'type="button" class="rule-delete-btn"',
        ),
      ),
      'rule-op',
    );
    return (
      '<div class="rule-row" data-rule-index="' +
      index +
      '"><div class="api-key-rule-grid">' +
      fields +
      '</div></div>'
    );
  },

  ruleField(content, extraClass) {
    return (
      '<div class="api-key-rule-field' +
      (extraClass ? ' ' + extraClass : '') +
      '">' +
      content +
      '</div>'
    );
  },

  renderRateLimitRules(tpmRules, rpmRules, maxMode, maxConc, isAdd, batchLimits) {
    tpmRules = tpmRules && tpmRules.length ? tpmRules : [];
    rpmRules = rpmRules && rpmRules.length ? rpmRules : [];
    var nameReadonly = isAdd === false;
    var tpmRows = tpmRules
      .map(function (rule, i) {
        return ApiKeyUpsert.ruleRow('tpm', rule, i, nameReadonly);
      })
      .join('');
    var rpmRows = rpmRules
      .map(function (rule, i) {
        return ApiKeyUpsert.ruleRow('rpm', rule, i, nameReadonly);
      })
      .join('');
    var tpmAddBtn =
      tpmRules.length < 3
        ? IvuUI.btn(
            '添加规则',
            'primary',
            'small',
            '',
            'type="button" id="btn-add-tpm-rule"',
          )
        : IvuUI.btn(
            '添加规则',
            'default',
            'small',
            'proto-btn-disabled',
            'type="button" disabled',
          );
    var rpmAddBtn =
      rpmRules.length < 3
        ? IvuUI.btn(
            '添加规则',
            'primary',
            'small',
            '',
            'type="button" id="btn-add-rpm-rule"',
          )
        : IvuUI.btn(
            '添加规则',
            'default',
            'small',
            'proto-btn-disabled',
            'type="button" disabled',
          );
    return (
      '<div class="rules-section" id="tpm-rules-section">' +
      '<h4 class="rules-title">TPM规则</h4>' +
      tpmRows +
      '<div class="rules-section-actions">' +
      tpmAddBtn +
      '</div>' +
      '</div>' +
      '<div class="rules-section" id="rpm-rules-section">' +
      '<h4 class="rules-title">RPM规则</h4>' +
      rpmRows +
      '<div class="rules-section-actions">' +
      rpmAddBtn +
      '</div>' +
      '</div>' +
      '<div class="max-concurrency-section">' +
      ApiKeyUpsert.rowSpan2(
        ApiKeyUpsert.col(
          IvuUI.formTopItem(
            '最大并发',
            ApiKeyUpsert.nativeSelect(
              'api-max-concurrency-mode',
              ['unlimited', 'banned', 'limited'],
              maxMode,
              ['不限制', '封禁', '限制并发数'],
            ) +
              '<div id="api-max-concurrency-input" class="max-concurrency-custom-input' +
              (maxMode === 'limited' ? '' : ' proto-hidden-inline') +
              '">' +
              IvuUI.inputNumber(
                maxConc > 0 ? maxConc : 100,
                'id="api-max-concurrency" style="width:100%"',
              ) +
              '</div>',
          ),
        ),
      ) +
      '</div>' +
      '<div class="rules-section" id="batch-limits-section">' +
      '<h4 class="rules-title">批量限流</h4>' +
      ApiKeyUpsert.rowSpan2(
        ApiKeyUpsert.col(
          IvuUI.formTopItem(
            '批量任务创建RPM',
            IvuUI.inputNumber(
              batchLimits && batchLimits.max_create_rpm > 0
                ? batchLimits.max_create_rpm
                : '',
              'id="api-batch-max-create-rpm" min="0" style="width:100%"',
            ),
          ),
        ) +
          ApiKeyUpsert.col(
            IvuUI.formTopItem(
              '在途批量任务上限',
              IvuUI.inputNumber(
                batchLimits && batchLimits.max_active_batches > 0
                  ? batchLimits.max_active_batches
                  : '',
                'id="api-batch-max-active-batches" min="0" style="width:100%"',
              ),
            ),
          ),
      ) +
      ApiKeyUpsert.rowSpan2(
        ApiKeyUpsert.col(
          IvuUI.formTopItem(
            '单文件字节上限',
            IvuUI.inputNumber(
              batchLimits && batchLimits.max_file_bytes > 0
                ? batchLimits.max_file_bytes
                : '',
              'id="api-batch-max-file-bytes" min="0" style="width:100%"',
            ),
          ),
        ) +
          ApiKeyUpsert.col(
            IvuUI.formTopItem(
              '单文件行数上限',
              IvuUI.inputNumber(
                batchLimits && batchLimits.max_file_lines > 0
                  ? batchLimits.max_file_lines
                  : '',
                'id="api-batch-max-file-lines" min="0" style="width:100%"',
              ),
            ),
          ),
      ) +
      '<p class="form-tip">四维度均按 API-Key 计、与模型无关；0 或留空 = 不配此维度；' +
      '不配置不代表批量不限流，仍受 BFE mod_ai_batch.data 全局硬顶约束</p>' +
      '</div>'
    );
  },

  nativeSelect(id, values, selected, labels, disabled) {
    labels = labels || values;
    var opts = values
      .map(function (val, i) {
        var sel = String(val) === String(selected) ? ' selected' : '';
        return (
          '<option value="' +
          IvuUI.escapeHtml(val) +
          '"' +
          sel +
          '>' +
          IvuUI.escapeHtml(labels[i] || val) +
          '</option>'
        );
      })
      .join('');
    var idAttr = id ? ' id="' + id + '"' : '';
    var disabledAttr = disabled ? ' disabled' : '';
    var disabledClass = disabled ? ' proto-field-disabled' : '';
    return (
      '<div class="ivu-select ivu-select-single' +
      (disabled ? ' proto-select-disabled' : '') +
      '" style="width:100%;">' +
      '<div class="ivu-select-selection">' +
      '<select class="proto-ivu-select-native' +
      disabledClass +
      '"' +
      idAttr +
      disabledAttr +
      ' style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
      opts +
      '</select></div></div>'
    );
  },

  renderViewBody(data) {
    data = data || {};
    var plan = data.quota_plan || {};
    var policy = data.rate_limit_policy || {};
    var isRMB = plan.unit === 'RMB';
    var decimals = isRMB ? 4 : 0;
    var used = (plan.balance && plan.balance.used) || 0;
    var quota = plan.quota || 0;
    var percent =
      quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
    var planLimited =
      !data.unlimited_quota &&
      plan.unlimited !== true &&
      plan.unlimited !== 'true';
    var rateEnabled = policy.enabled === true || policy.enabled === 'true';
    var maxConc = policy.rules && policy.rules.max_concurrency;
    var tpmRules = (policy.rules && policy.rules.tpm) || [];
    var rpmRules = (policy.rules && policy.rules.rpm) || [];
    var batchLimits = (policy.rules && policy.rules.batch_limits) || null;
    var subnetText = '*';
    if (data.subnet) {
      if (Array.isArray(data.subnet)) {
        subnetText =
          data.subnet.indexOf('*') >= 0 ? '*' : data.subnet.join(', ');
      } else {
        subnetText = data.subnet;
      }
    }

    function infoRow(label, value) {
      return (
        '<div class="info-row"><span class="info-label">' +
        label +
        '</span><span class="info-value">' +
        value +
        '</span></div>'
      );
    }

    function formatQuotaValue(val) {
      if (isRMB) return '¥' + ApiKeyUpsert.formatNumber(val, decimals);
      return ApiKeyUpsert.formatNumber(val, decimals) + ' tokens';
    }

    var quotaCard = IvuUI.card(
      '配额信息',
      infoRow('配额类型', planLimited ? '有限配额' : '无限配额') +
        (planLimited
          ? infoRow('配额总量', formatQuotaValue(quota)) +
            infoRow('已使用', formatQuotaValue(used) + ' (' + percent + '%)') +
            infoRow('剩余', formatQuotaValue(Math.max(0, quota - used))) +
            infoRow(
              '重置周期',
              plan.reset_period === 'monthly'
                ? '每月'
                : plan.reset_period === 'weekly'
                ? '每周'
                : '永不重置',
            ) +
            '<div class="quota-progress">' +
            '<div class="progress-label">使用进度</div>' +
            '<div class="proto-progress"><div class="proto-progress-inner" style="width:' +
            percent +
            '%"></div></div>' +
            '</div>' +
            (Prototype.isReadonly()
              ? ''
              : '<div style="margin-top:16px;">' +
                IvuUI.btn(
                  '重置配额',
                  'primary',
                  'small',
                  '',
                  'type="button" id="btn-api-reset-quota"',
                ) +
                '</div>')
          : ''),
    );

    var rateCard = IvuUI.card(
      '限流配置',
      infoRow(
        '限流状态',
        IvuUI.tag(
          rateEnabled ? '已启用' : '未启用',
          rateEnabled ? 'success' : 'default',
        ),
      ) +
        (rateEnabled
          ? infoRow(
              '最大并发',
              maxConc === 0 ? '封禁' : maxConc > 0 ? String(maxConc) : '不限制',
            ) +
            (tpmRules.length
              ? ApiKeyUpsert.renderRulesDetail('TPM规则', tpmRules, 'tpm')
              : '') +
            (rpmRules.length
              ? ApiKeyUpsert.renderRulesDetail('RPM规则', rpmRules, 'rpm')
              : '') +
            (ApiKeyUpsert.renderBatchLimitsDetail(batchLimits) || '')
          : ''),
    );

    return (
      '<div class="api-key-view">' +
      IvuUI.card(
        '基本信息',
        infoRow('描述', IvuUI.escapeHtml(data.description || '-')) +
          infoRow('Key标识', IvuUI.escapeHtml(data.id || '-')) +
          infoRow(
            'Key值',
            IvuUI.escapeHtml(data.key || '-') +
              (data.key
                ? ' ' +
                  IvuUI.btn('复制', 'default', 'small', '', 'type="button"')
                : ''),
          ) +
          infoRow(
            '状态',
            IvuUI.tag(
              data.enabled !== false ? '已启用' : '未启用',
              data.enabled !== false ? 'success' : 'default',
            ),
          ) +
          infoRow(
            '过期时间',
            ApiKeyUpsert.formatExpiredTime(data.expire_time),
          ) +
          infoRow(
            '无限配额',
            IvuUI.tag(
              data.unlimited_quota ? '是' : '否',
              data.unlimited_quota ? 'success' : 'default',
            ),
          ) +
          infoRow('允许模型', ApiKeyUpsert.formatModelsText(data.models)) +
          infoRow('允许子网', IvuUI.escapeHtml(subnetText)) +
          infoRow(
            '挂载Entity',
            data.entity && data.entity.name
              ? IvuUI.escapeHtml(data.entity.name) +
                  ' (' +
                  IvuUI.escapeHtml(data.entity.type || '-') +
                  ')'
              : '-',
          ) +
          infoRow('创建时间', ApiKeyUpsert.formatTime(data.create_time)) +
          infoRow('更新时间', ApiKeyUpsert.formatTime(data.update_time)),
      ) +
      quotaCard +
      rateCard +
      '</div>'
    );
  },

  renderRulesDetail(title, rules, type) {
    var items = rules
      .map(function (rule) {
        var lines = [
          '规则名称：' + (rule.name || '-'),
          '适用模型：' + (rule.model === '*' ? '全部模型' : rule.model),
        ];
        lines.push('时间窗口：' + (rule.window_minutes || '-') + '分钟');
        if (type === 'tpm') {
          lines.push('最大Token数：' + (rule.max_tokens || '-'));
          lines.push('滑动步长(分)：' + (rule.step_minutes || '-'));
        } else {
          lines.push('最大请求数：' + (rule.max_requests || '-'));
        }
        return (
          '<div class="rule-detail-item">' +
          lines
            .map(function (l) {
              return '<div>' + l + '</div>';
            })
            .join('') +
          '</div>'
        );
      })
      .join('');
    return (
      '<div class="rules-detail">' +
      '<div class="rules-detail-title">' +
      title +
      ' (' +
      rules.length +
      '条)</div>' +
      items +
      '</div>'
    );
  },

  drawer(mode, data) {
    var title =
      mode === 'add'
        ? '创建 API-Key'
        : mode === 'view'
        ? 'API-Key 详情'
        : '编辑 API-Key';
    var body =
      mode === 'view'
        ? ApiKeyUpsert.renderViewBody(data)
        : ApiKeyUpsert.renderUpsertBody(data, mode === 'add');
    var footer =
      mode === 'view'
        ? '<div class="com-btn-box drawer-footer api-key-drawer-footer">' +
          IvuUI.btn('关闭', 'default', 'default', '', 'id="btn-api-close"') +
          '</div>'
        : '<div class="com-btn-box drawer-footer api-key-drawer-footer">' +
          IvuUI.btn(
            '取消',
            'default',
            'default',
            'btn-box-del',
            'id="btn-api-cancel"',
          ) +
          ' ' +
          IvuUI.btn('提交', 'primary', 'default', '', 'id="btn-api-submit"') +
          '</div>';
    return IvuUI.drawer('drawer-api-key', title, body, footer, '60%');
  },

  keyModal() {
    return (
      '<div id="modal-api-key-value" class="ivu-modal-wrap proto-hidden">' +
      '<div class="ivu-modal-mask" data-close-modal="modal-api-key-value"></div>' +
      '<div class="ivu-modal proto-key-modal">' +
      '<div class="ivu-modal-content">' +
      '<div class="ivu-modal-header"><div class="ivu-modal-header-inner">API Key 管理 详情</div></div>' +
      '<div class="ivu-modal-body">' +
      '<div style="word-break:break-all;padding:20px 0;display:flex;align-items:center;gap:8px;">' +
      '<input id="modal-api-key-input" class="ivu-input" readonly style="width:90%;" />' +
      '<span class="proto-copy-icon" id="btn-api-copy-key" title="复制">📋</span>' +
      '</div>' +
      '</div>' +
      '<div class="ivu-modal-footer">' +
      IvuUI.btn(
        '取消',
        'primary',
        'default',
        '',
        'data-close-modal="modal-api-key-value"',
      ) +
      '</div>' +
      '</div></div></div>'
    );
  },

  resetQuotaModal() {
    return (
      '<div id="modal-api-reset-quota" class="ivu-modal-wrap proto-hidden">' +
      '<div class="ivu-modal-mask" data-close-modal="modal-api-reset-quota"></div>' +
      '<div class="ivu-modal reset-quota-modal">' +
      '<div class="ivu-modal-content">' +
      '<div class="ivu-modal-header"><div class="ivu-modal-header-inner">重置配额</div></div>' +
      '<div class="ivu-modal-body">' +
      '<div class="modal-form-item">' +
      '<div class="modal-label">新配额总量</div>' +
      IvuUI.inputNumber(
        0,
        'id="modal-reset-quota-total" style="width:100%" ' +
          ApiKeyUpsert.quotaInputAttrs(false),
      ) +
      '</div>' +
      '<p class="form-tip">设置后将重置已使用量为0，配额总量为新设置的值</p>' +
      '<div class="modal-form-item" style="margin-top:16px;">' +
      '<div class="modal-label">重置原因</div>' +
      '<div class="ivu-input-wrapper ivu-input-type-textarea">' +
      '<textarea id="modal-reset-quota-reason" class="ivu-input" rows="3" placeholder="请输入重置原因（可选）"></textarea>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="ivu-modal-footer">' +
      IvuUI.btn(
        '取消',
        'default',
        'default',
        '',
        'data-close-modal="modal-api-reset-quota"',
      ) +
      ' ' +
      IvuUI.btn(
        '确定',
        'primary',
        'default',
        '',
        'id="btn-api-reset-quota-confirm"',
      ) +
      '</div>' +
      '</div></div></div>'
    );
  },
};
