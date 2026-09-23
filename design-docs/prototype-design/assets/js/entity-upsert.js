window.EntityUpsert = {
  // EntityName: 1-64; lowercase letters, digits, _, -, @ (user@project);
  // cannot start/end with _, -, or @
  ENTITY_NAME_RE: /^[a-z0-9](?:[a-z0-9_@-]{0,62}[a-z0-9])?$/,
  RMB_QUOTA_MAX: 90000000,
  TOKEN_QUOTA_MAX: 9999999999,

  quotaMax(isRMB) {
    return isRMB ? EntityUpsert.RMB_QUOTA_MAX : EntityUpsert.TOKEN_QUOTA_MAX;
  },

  quotaInputAttrs(isRMB) {
    return (
      (isRMB ? 'step="0.0001" ' : 'step="1" ') +
      'min="0" max="' +
      EntityUpsert.quotaMax(isRMB) +
      '"'
    );
  },

  applyQuotaInputLimits(input, isRMB) {
    if (!input) return;
    input.step = isRMB ? '0.0001' : '1';
    input.min = '0';
    input.max = String(EntityUpsert.quotaMax(isRMB));
    var num = Number(input.value);
    if (Number.isFinite(num) && num > EntityUpsert.quotaMax(isRMB)) {
      input.value = EntityUpsert.quotaMax(isRMB);
    }
  },

  validateQuotaValue(value, isRMB) {
    if (value === '' || value == null) return '请输入有效的配额总量';
    var num = Number(value);
    if (!Number.isFinite(num) || num < 0) return '请输入有效的配额总量';
    if (isRMB) {
      if (num > EntityUpsert.RMB_QUOTA_MAX) return '配额总量超出允许范围';
      var dec = (String(value).split('.')[1] || '').length;
      if (dec > 4) return 'RMB 配额最多保留 4 位小数';
      return null;
    }
    if (!Number.isInteger(num)) return 'total_token 配额必须为整数';
    if (num > EntityUpsert.TOKEN_QUOTA_MAX) return '配额总量超出允许范围';
    return null;
  },

  validateEntityName(value) {
    var val = String(value || '');
    if (!val || val.trim() === '') return '请输入名称';
    if (val.length !== val.trim().length) return '名称不能包含前后空白字符';
    if (val.length > 64) return '名称不能超过64个字符';
    if (!EntityUpsert.ENTITY_NAME_RE.test(val)) {
      return '名称须为小写字母、数字、下划线、连字符或 @（如 user@project），且不能以 _、- 或 @ 开头/结尾';
    }
    return null;
  },
  validateEntityDescription(value) {
    var val = String(value == null ? '' : value);
    if (val === '') return null;
    if (val.length > 255) return '描述不能超过255个字符';
    if (/[\x00-\x1F\x7F]/.test(val)) return '描述不能包含控制字符';
    return null;
  },
  formatQuota(row) {
    var plan = row.quota_plan || {};
    if (plan.unlimited === true || plan.unlimited === 'true') return '-';
    var used = (plan.balance && plan.balance.used) || 0;
    var quota = plan.quota || 0;
    var isRMB = plan.unit === 'RMB';
    var unitText = isRMB ? '¥' : '';
    var suffix = isRMB ? '' : '';
    if (isRMB) {
      return (
        unitText +
        EntityUpsert.formatNumber(used, 4) +
        ' / ' +
        unitText +
        EntityUpsert.formatNumber(quota, 4)
      );
    }
    return (
      EntityUpsert.formatNumber(used) + ' / ' + EntityUpsert.formatNumber(quota)
    );
  },

  formatNumber(num, decimals) {
    num = Number(num) || 0;
    if (decimals != null) {
      return num.toLocaleString('zh-CN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  },

  formatTime(timestamp) {
    if (!timestamp) return '-';
    return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN');
  },

  parentName(row, entities) {
    if (!row || !row.parent_id) return '-';
    var parent = (entities || []).find(function (item) {
      return String(item.id) === String(row.parent_id);
    });
    return parent ? parent.name : '-';
  },

  formatModelsText(models) {
    return ApiKeyUpsert.formatModelsText(models);
  },

  rowSpan2(content) {
    return ApiKeyUpsert.rowSpan2(content);
  },

  col(content) {
    return ApiKeyUpsert.col(content);
  },

  nativeSelect(id, values, selected, labels, disabled) {
    return ApiKeyUpsert.nativeSelect(id, values, selected, labels, disabled);
  },

  renderQuotaDetails(plan, visible) {
    plan = plan || {};
    return (
      '<div id="entity-quota-details"' +
      (visible ? '' : ' class="proto-hidden-inline"') +
      '>' +
      EntityUpsert.rowSpan2(
        EntityUpsert.col(
          IvuUI.formTopItem(
            '配额不足时放行',
            EntityUpsert.nativeSelect(
              'entity-pass-no-quota',
              ['true', 'false'],
              plan.pass_when_no_enough_quota === true ||
                plan.pass_when_no_enough_quota === 'true'
                ? 'true'
                : 'false',
              ['是', '否'],
            ),
          ),
        ) +
          EntityUpsert.col(
            IvuUI.formTopItem(
              '配额总量',
              IvuUI.inputNumber(
                plan.quota || 1000000,
                'id="entity-quota-total" style="width:100%" ' +
                  EntityUpsert.quotaInputAttrs(plan.unit === 'RMB'),
              ),
            ),
          ),
      ) +
      EntityUpsert.rowSpan2(
        EntityUpsert.col(
          IvuUI.formTopItem(
            '配额单位',
            EntityUpsert.nativeSelect(
              'entity-quota-unit',
              ['total_token', 'RMB'],
              plan.unit || 'total_token',
              ['total_token', 'RMB'],
            ),
          ),
        ) +
          EntityUpsert.col(
            IvuUI.formTopItem(
              '重置周期',
              EntityUpsert.nativeSelect(
                'entity-reset-period',
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

  renderUpsertBody(data, isAdd, entityList) {
    data = data || {};
    entityList = entityList || [];
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
    var rateEnabled = policy.enabled === true || policy.enabled === 'true';
    var planLimited = plan.unlimited === false || plan.unlimited === 'false';
    var maxConc = policy.rules && policy.rules.max_concurrency;
    var maxMode =
      maxConc === 0 ? 'banned' : maxConc > 0 ? 'limited' : 'unlimited';
    var tpmRules = (policy.rules && policy.rules.tpm) || [];
    var rpmRules = (policy.rules && policy.rules.rpm) || [];
    var typeOptions = (MockData.entityTypes || []).map(function (t) {
      return t.type_name;
    });
    var currentType = data.type || typeOptions[0] || '';
    var currentTypeLevel = 0;
    if (currentType) {
      var typeInfo = (MockData.entityTypes || []).find(function (t) {
        return t.type_name === currentType;
      });
      currentTypeLevel = typeInfo ? typeInfo.level : 0;
    }
    var parentOptions = entityList.filter(function (item) {
      if (String(item.id) === String(data.id)) return false;
      var entityTypeInfo = (MockData.entityTypes || []).find(function (t) {
        return t.type_name === item.type;
      });
      if (!entityTypeInfo) return true;
      return entityTypeInfo.level < currentTypeLevel;
    });
    var parentValues = [''].concat(
      parentOptions.map(function (item) {
        return String(item.id);
      }),
    );
    var parentLabels = ['无'].concat(
      parentOptions.map(function (item) {
        return item.name;
      }),
    );
    var allowModels =
      data.allow_models && data.allow_models.length
        ? data.allow_models.slice()
        : ['*'];
    var blockModels =
      data.block_models && data.block_models.length
        ? data.block_models.slice()
        : [];

    return (
      '<form class="ivu-form ivu-form-label-top api-key-upsert-form" id="entity-upsert-form">' +
      IvuUI.card(
        '基本信息',
        IvuUI.formTopItem(
          '名称',
          '<div class="ivu-input-wrapper ivu-input-type-text">' +
            '<input type="text" id="entity-name" class="ivu-input' +
            (isAdd ? '' : ' proto-field-disabled') +
            '"' +
            (isAdd ? '' : ' readonly disabled') +
            ' maxlength="64" value="' +
            IvuUI.escapeHtml(data.name || '') +
            '" placeholder="user@project" />' +
            '</div>' +
            '<p class="form-tip">1–64 字符；仅小写字母、数字、_、-、@（支持 用户名@项目名）；不能以 _、- 或 @ 开头/结尾</p>',
          true,
        ) +
          IvuUI.formTopItem(
            '描述',
            '<div class="ivu-input-wrapper ivu-input-type-text">' +
              '<input type="text" id="entity-description" class="ivu-input" maxlength="255" value="' +
              IvuUI.escapeHtml(data.description || '') +
              '" placeholder="请输入Entity描述" />' +
              '</div>',
          ) +
          EntityUpsert.rowSpan2(
            EntityUpsert.col(
              IvuUI.formTopItem(
                '类型',
                EntityUpsert.nativeSelect(
                  'entity-type',
                  typeOptions,
                  data.type || typeOptions[0] || 'dep',
                  typeOptions,
                  !isAdd,
                ),
              ),
            ) +
              EntityUpsert.col(
                IvuUI.formTopItem(
                  '父Entity',
                  EntityUpsert.nativeSelect(
                    'entity-parent',
                    parentValues,
                    data.parent_id != null && data.parent_id !== ''
                      ? String(data.parent_id)
                      : '',
                    parentLabels,
                  ) +
                    '<p class="form-tip">选择父Entity时，父Entity的级别必须小于当前类型的级别</p>',
                ),
              ),
          ) +
          EntityUpsert.rowSpan2(
            EntityUpsert.col(
              IvuUI.formTopItem(
                '允许模型',
                ApiKeyUpsert.renderModelsMultiSelect(allowModels, {
                  rootId: 'entity-allow-models',
                  placeholder: '选择允许访问的模型',
                }),
              ),
            ) +
              EntityUpsert.col(
                IvuUI.formTopItem(
                  '禁止模型',
                  ApiKeyUpsert.renderModelsMultiSelect(blockModels, {
                    rootId: 'entity-block-models',
                    includeAll: false,
                    placeholder: '选择禁止访问的模型',
                  }),
                ),
              ),
          ),
      ) +
      IvuUI.card(
        '配额信息',
        EntityUpsert.rowSpan2(
          EntityUpsert.col(
            IvuUI.formTopItem(
              '无限配额',
              EntityUpsert.nativeSelect(
                'entity-plan-unlimited',
                ['true', 'false'],
                planLimited ? 'false' : 'true',
                ['是', '否'],
              ),
            ),
          ),
        ) + EntityUpsert.renderQuotaDetails(plan, planLimited),
      ) +
      IvuUI.card(
        '限流配置',
        EntityUpsert.rowSpan2(
          EntityUpsert.col(
            IvuUI.formTopItem(
              '<span class="rate-limit-label">启用限流' +
                '<span class="rate-limit-help-icon" title="启用限流后，可配置TPM、RPM等限流规则">' +
                '?' +
                '</span></span>',
              EntityUpsert.nativeSelect(
                'entity-rate-enabled',
                ['true', 'false'],
                rateEnabled ? 'true' : 'false',
                ['是', '否'],
              ),
            ),
          ),
        ) +
          '<div id="entity-rate-details"' +
          (rateEnabled ? '' : ' class="proto-hidden-inline"') +
          '>' +
          ApiKeyUpsert.renderRateLimitRules(
            tpmRules,
            rpmRules,
            maxMode,
            maxConc,
            isAdd,
          ) +
          '</div>',
      ) +
      '</form>'
    );
  },

  renderViewBody(data, entityList) {
    data = data || {};
    var plan = data.quota_plan || {};
    var policy = data.rate_limit_policy || {};
    var used = (plan.balance && plan.balance.used) || 0;
    var quota = plan.quota || 0;
    var percent =
      quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
    var planLimited = plan.unlimited === false || plan.unlimited === 'false';
    var rateEnabled = policy.enabled === true || policy.enabled === 'true';
    var maxConc = policy.rules && policy.rules.max_concurrency;
    var tpmRules = (policy.rules && policy.rules.tpm) || [];
    var rpmRules = (policy.rules && policy.rules.rpm) || [];
    var isRMB = plan.unit === 'RMB';
    var quotaDecimals = isRMB ? 4 : 0;
    var quotaUnitText = isRMB ? '¥' : ' tokens';
    var formatQuotaNum = function (num) {
      return EntityUpsert.formatNumber(num, quotaDecimals);
    };
    var blockModels = (data.block_models || []).filter(function (m) {
      return m !== '*';
    });

    function infoRow(label, value) {
      return (
        '<div class="info-row"><span class="info-label">' +
        label +
        '</span><span class="info-value">' +
        value +
        '</span></div>'
      );
    }

    var quotaCard = IvuUI.card(
      '配额信息',
      infoRow('无限配额', planLimited ? '否' : '是') +
        (planLimited
          ? infoRow(
              '配额不足时放行',
              plan.pass_when_no_enough_quota ? '是' : '否',
            ) +
            infoRow(
              '配额总量',
              isRMB
                ? '¥' + formatQuotaNum(quota)
                : formatQuotaNum(quota) + ' tokens',
            ) +
            infoRow(
              '已使用',
              (isRMB
                ? '¥' + formatQuotaNum(used)
                : formatQuotaNum(used) + ' tokens') +
                ' (' +
                percent +
                '%)',
            ) +
            infoRow(
              '剩余',
              isRMB
                ? '¥' + formatQuotaNum(Math.max(0, quota - used))
                : formatQuotaNum(Math.max(0, quota - used)) + ' tokens',
            ) +
            infoRow('配额单位', plan.unit || 'total_token') +
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
            '<div style="margin-top:16px;">' +
            IvuUI.btn(
              '重置配额',
              'primary',
              'small',
              '',
              'type="button" id="btn-entity-reset-quota"',
            ) +
            '</div>'
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
              : '')
          : ''),
    );

    return (
      '<div class="api-key-view">' +
      IvuUI.card(
        '基本信息',
        infoRow('名称', IvuUI.escapeHtml(data.name || '-')) +
          infoRow('描述', IvuUI.escapeHtml(data.description || '-')) +
          infoRow('类型', IvuUI.escapeHtml(data.type || '-')) +
          infoRow(
            '父Entity',
            IvuUI.escapeHtml(EntityUpsert.parentName(data, entityList)),
          ) +
          infoRow('创建时间', EntityUpsert.formatTime(data.create_time)) +
          infoRow('更新时间', EntityUpsert.formatTime(data.update_time)) +
          infoRow(
            '允许模型',
            EntityUpsert.formatModelsText(data.allow_models),
          ) +
          infoRow(
            '禁止模型',
            blockModels.length ? IvuUI.escapeHtml(blockModels.join(', ')) : '-',
          ),
      ) +
      quotaCard +
      rateCard +
      '</div>'
    );
  },

  renderTypeUpsertBody(data, isAdd) {
    data = data || {};
    var levelOptions = ['1', '2', '3', '4', '5'];
    return (
      '<form class="ivu-form ivu-form-label-top entity-type-form" id="entity-type-upsert-form">' +
      IvuUI.formTopItem(
        '类型名',
        '<div class="ivu-input-wrapper ivu-input-type-text">' +
          '<input type="text" id="entity-type-name" class="ivu-input' +
          (isAdd ? '' : ' proto-field-disabled') +
          '"' +
          (isAdd ? '' : ' readonly disabled') +
          ' maxlength="32" value="' +
          IvuUI.escapeHtml(data.type_name || '') +
          '" placeholder="例如：dep" />' +
          '</div>' +
          '<p class="form-tip">1-32字符，仅含小写字母、数字、下划线、连字符，需以小写字母开头</p>',
        true,
      ) +
      IvuUI.formTopItem(
        '描述',
        '<div class="ivu-input-wrapper ivu-input-type-text">' +
          '<input type="text" id="entity-type-desc" class="ivu-input" maxlength="1024" value="' +
          IvuUI.escapeHtml(data.description || '') +
          '" placeholder="例如：一级部门" />' +
          '</div>' +
          '<p class="form-tip">最多1024字符</p>',
      ) +
      IvuUI.formTopItem(
        '级别',
        EntityUpsert.nativeSelect(
          'entity-type-level',
          levelOptions,
          String(data.level || 1),
          levelOptions,
        ) + '<p class="form-tip">取值范围1-5，数字越小级别越高</p>',
      ) +
      '</form>'
    );
  },

  initUpsertForm() {
    function toggle(el, show) {
      if (!el) return;
      el.classList.toggle('proto-hidden-inline', !show);
    }

    function setFieldError(inputEl, error) {
      if (!inputEl) return;
      var wrapper = inputEl.closest('.ivu-form-item');
      if (!wrapper) return;
      var errMsg = wrapper.querySelector('.proto-field-error-msg');
      if (error) {
        inputEl.classList.add('ivu-input-error');
        if (!errMsg) {
          errMsg = document.createElement('div');
          errMsg.className = 'proto-field-error-msg';
          errMsg.style.cssText = 'color:#ed4014;font-size:12px;margin-top:4px;';
          wrapper.appendChild(errMsg);
        }
        errMsg.textContent = error;
      } else {
        inputEl.classList.remove('ivu-input-error');
        if (errMsg) errMsg.remove();
      }
    }

    // 无限配额切换
    var planSelect = document.getElementById('entity-plan-unlimited');
    if (planSelect) {
      var syncQuota = function () {
        toggle(
          document.getElementById('entity-quota-details'),
          planSelect.value === 'false',
        );
      };
      planSelect.onchange = syncQuota;
      syncQuota();
    }

    var quotaUnitSelect = document.getElementById('entity-quota-unit');
    var quotaTotalInput = document.getElementById('entity-quota-total');
    if (quotaUnitSelect && quotaTotalInput) {
      quotaUnitSelect.addEventListener('change', function () {
        EntityUpsert.applyQuotaInputLimits(
          quotaTotalInput,
          quotaUnitSelect.value === 'RMB',
        );
      });
    }

    // 启用限流切换
    var rateSelect = document.getElementById('entity-rate-enabled');
    if (rateSelect) {
      var syncRate = function () {
        toggle(
          document.getElementById('entity-rate-details'),
          rateSelect.value === 'true',
        );
      };
      rateSelect.onchange = syncRate;
      syncRate();
    }

    // 最大并发模式切换
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

    // 类型变化时更新父Entity可选列表
    var typeSelect = document.getElementById('entity-type');
    var parentSelect = document.getElementById('entity-parent');
    if (typeSelect && parentSelect) {
      typeSelect.onchange = function () {
        var currentType = typeSelect.value;
        var entityRows = window._entityUpsertRows || [];
        var typeInfo = (MockData.entityTypes || []).find(function (t) {
          return t.type_name === currentType;
        });
        var currentLevel = typeInfo ? typeInfo.level : 0;
        var currentId = window._entityUpsertCurrentId || '';
        var filtered = entityRows.filter(function (item) {
          if (String(item.id) === String(currentId)) return false;
          var entityTypeInfo = (MockData.entityTypes || []).find(function (t) {
            return t.type_name === item.type;
          });
          if (!entityTypeInfo) return true;
          return entityTypeInfo.level < currentLevel;
        });
        var oldVal = parentSelect.value;
        parentSelect.innerHTML = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '无';
        parentSelect.appendChild(opt);
        filtered.forEach(function (item) {
          var o = document.createElement('option');
          o.value = String(item.id);
          o.textContent = item.name;
          parentSelect.appendChild(o);
        });
        var stillExists = filtered.some(function (item) {
          return String(item.id) === oldVal;
        });
        parentSelect.value = stillExists ? oldVal : '';
      };
    }

    // 名称校验
    var nameInput = document.getElementById('entity-name');
    if (nameInput) {
      var validateName = function () {
        var err = EntityUpsert.validateEntityName(nameInput.value);
        if (err) {
          setFieldError(nameInput, err);
          return false;
        }
        setFieldError(nameInput, null);
        return true;
      };
      nameInput.addEventListener('blur', validateName);
      nameInput.addEventListener('input', function () {
        if (nameInput.classList.contains('ivu-input-error')) validateName();
      });
    }

    // 描述校验
    var descInput = document.getElementById('entity-description');
    if (descInput) {
      var validateDesc = function () {
        var err = EntityUpsert.validateEntityDescription(descInput.value);
        if (err) {
          setFieldError(descInput, err);
          return false;
        }
        setFieldError(descInput, null);
        return true;
      };
      descInput.addEventListener('blur', validateDesc);
      descInput.addEventListener('input', function () {
        if (descInput.classList.contains('ivu-input-error')) validateDesc();
      });
    }

    ApiKeyUpsert.initModelsMultiSelect('entity-allow-models');
    ApiKeyUpsert.initModelsMultiSelect('entity-block-models');
  },

  validateEntityForm() {
    var nameInput = document.getElementById('entity-name');
    var typeSelect = document.getElementById('entity-type');
    var descInput = document.getElementById('entity-description');
    var valid = true;

    function setFieldError(inputEl, error) {
      if (!inputEl) return;
      var wrapper = inputEl.closest('.ivu-form-item');
      if (!wrapper) return;
      var errMsg = wrapper.querySelector('.proto-field-error-msg');
      if (error) {
        inputEl.classList.add('ivu-input-error');
        if (!errMsg) {
          errMsg = document.createElement('div');
          errMsg.className = 'proto-field-error-msg';
          errMsg.style.cssText = 'color:#ed4014;font-size:12px;margin-top:4px;';
          wrapper.appendChild(errMsg);
        }
        errMsg.textContent = error;
      } else {
        inputEl.classList.remove('ivu-input-error');
        if (errMsg) errMsg.remove();
      }
    }

    // 名称校验
    if (nameInput) {
      var nameErr = EntityUpsert.validateEntityName(nameInput.value);
      if (nameErr) {
        setFieldError(nameInput, nameErr);
        valid = false;
      } else {
        setFieldError(nameInput, null);
      }
    }

    // 描述校验
    if (descInput) {
      var descErr = EntityUpsert.validateEntityDescription(descInput.value);
      if (descErr) {
        setFieldError(descInput, descErr);
        valid = false;
      } else {
        setFieldError(descInput, null);
      }
    }

    // 类型校验
    if (typeSelect && (!typeSelect.value || typeSelect.value === '')) {
      valid = false;
    }

    if (!valid) {
      Prototype.toast('请检查表单填写是否正确');
    }
    return valid;
  },

  validateEntityTypeForm() {
    var nameInput = document.getElementById('entity-type-name');
    var descInput = document.getElementById('entity-type-desc');
    var valid = true;

    function setFieldError(inputEl, error) {
      if (!inputEl) return;
      var wrapper = inputEl.closest('.ivu-form-item');
      if (!wrapper) return;
      var errMsg = wrapper.querySelector('.proto-field-error-msg');
      if (error) {
        inputEl.classList.add('ivu-input-error');
        if (!errMsg) {
          errMsg = document.createElement('div');
          errMsg.className = 'proto-field-error-msg';
          errMsg.style.cssText = 'color:#ed4014;font-size:12px;margin-top:4px;';
          wrapper.appendChild(errMsg);
        }
        errMsg.textContent = error;
      } else {
        inputEl.classList.remove('ivu-input-error');
        if (errMsg) errMsg.remove();
      }
    }

    // 类型名校验
    if (nameInput) {
      var val = nameInput.value;
      var regex = /^[a-z][a-z0-9_-]{0,31}$/;
      if (!val || val.trim() === '') {
        setFieldError(nameInput, '请输入类型名');
        valid = false;
      } else if (!regex.test(val)) {
        setFieldError(
          nameInput,
          '类型名需以小写字母开头，仅含小写字母、数字、下划线、连字符，最多32字符',
        );
        valid = false;
      } else {
        setFieldError(nameInput, null);
      }
    }

    // 描述校验
    if (descInput) {
      var desc = descInput.value;
      if (desc.length > 1024) {
        setFieldError(descInput, '描述不能超过1024个字符');
        valid = false;
      } else {
        setFieldError(descInput, null);
      }
    }

    if (!valid) {
      Prototype.toast('请检查表单填写是否正确');
    }
    return valid;
  },

  drawer(mode, data, entityList) {
    var title =
      mode === 'add'
        ? '创建Entity'
        : mode === 'view'
        ? 'Entity 详情'
        : '编辑Entity';
    var body =
      mode === 'view'
        ? EntityUpsert.renderViewBody(data, entityList)
        : EntityUpsert.renderUpsertBody(data, mode === 'add', entityList);
    var footer =
      mode === 'view'
        ? '<div class="com-btn-box drawer-footer api-key-drawer-footer">' +
          IvuUI.btn('关闭', 'default', 'default', '', 'id="btn-entity-close"') +
          '</div>'
        : '<div class="com-btn-box drawer-footer api-key-drawer-footer">' +
          IvuUI.btn(
            '取消',
            'default',
            'default',
            'btn-box-del',
            'id="btn-entity-cancel"',
          ) +
          ' ' +
          IvuUI.btn(
            '提交',
            'primary',
            'default',
            '',
            'id="btn-entity-submit"',
          ) +
          '</div>';
    return IvuUI.drawer('drawer-entity', title, body, footer, '60%');
  },

  typeDrawer(mode, data) {
    var title = mode === 'add' ? '创建类型' : '编辑类型';
    var body = EntityUpsert.renderTypeUpsertBody(data, mode === 'add');
    var footer =
      '<div class="com-btn-box drawer-footer api-key-drawer-footer">' +
      IvuUI.btn(
        '取消',
        'default',
        'default',
        'btn-box-del',
        'id="btn-entity-type-cancel"',
      ) +
      ' ' +
      IvuUI.btn(
        '提交',
        'primary',
        'default',
        '',
        'id="btn-entity-type-submit"',
      ) +
      '</div>';
    return IvuUI.drawer('drawer-entity-type', title, body, footer, '50%');
  },

  resetQuotaModal() {
    return (
      '<div id="modal-entity-reset-quota" class="ivu-modal-wrap proto-hidden">' +
      '<div class="ivu-modal-mask" data-close-modal="modal-entity-reset-quota"></div>' +
      '<div class="ivu-modal reset-quota-modal">' +
      '<div class="ivu-modal-content">' +
      '<div class="ivu-modal-header"><div class="ivu-modal-header-inner">重置配额</div></div>' +
      '<div class="ivu-modal-body">' +
      '<div class="modal-form-item">' +
      '<div class="modal-label">新配额总量</div>' +
      IvuUI.inputNumber(
        0,
        'id="modal-entity-reset-quota-total" style="width:100%" ' +
          EntityUpsert.quotaInputAttrs(false),
      ) +
      '</div>' +
      '<p class="form-tip">设置后将重置已使用量为0，配额总量为新设置的值</p>' +
      '<div class="modal-form-item" style="margin-top:16px;">' +
      '<div class="modal-label">重置原因</div>' +
      '<div class="ivu-input-wrapper ivu-input-type-textarea">' +
      '<textarea id="modal-entity-reset-quota-reason" class="ivu-input" rows="3" placeholder="请输入重置原因（可选）"></textarea>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="ivu-modal-footer">' +
      IvuUI.btn(
        '取消',
        'default',
        'default',
        '',
        'data-close-modal="modal-entity-reset-quota"',
      ) +
      ' ' +
      IvuUI.btn(
        '确定',
        'primary',
        'default',
        '',
        'id="btn-entity-reset-quota-confirm"',
      ) +
      '</div>' +
      '</div></div></div>'
    );
  },
};
