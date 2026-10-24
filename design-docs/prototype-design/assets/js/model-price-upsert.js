window.ModelPriceUpsert = {
  drawerId: 'model-price-drawer',
  data: null,
  isView: false,
  onSuccess: null,
  errors: { source: '', limits: '', prices: '', batch_discount: '' },

  drawer: function (data, isView, onSuccess) {
    this.data = data
      ? JSON.parse(JSON.stringify(data))
      : {
          id: null,
          provider: '',
          model: '',
          base_model: '',
          mode: 'chat',
          capabilities: [],
          supported_parameters: [],
          limits: [],
          prices: [],
          metadata: { source: '', notes: '' },
        };
    this.isView = isView;
    this.onSuccess = onSuccess || null;
    this.errors = {
      source: '',
      limits: '',
      prices: '',
      tier_prices: '',
      batch_discount: '',
    };

    // 转换对象为数组用于表单渲染
    if (!Array.isArray(this.data.limits)) {
      this.data.limits = this.objectToList(this.data.limits || {});
    }
    if (!Array.isArray(this.data.prices)) {
      this.data.prices = this.objectToList(this.data.prices || {});
    }
    this.initTierPricesData();

    var title = isView ? '查看' : data ? '编辑' : '创建';
    var body = this.renderBody();
    var footer = isView ? null : this.renderFooter();

    var oldDrawer = document.getElementById(this.drawerId);
    if (oldDrawer) oldDrawer.remove();

    var drawerHtml = IvuUI.drawer(this.drawerId, title, body, footer, '60%');
    document.body.insertAdjacentHTML('beforeend', drawerHtml);

    Prototype.openDrawer(this.drawerId);
    this.bindEvents();
  },

  objectToList: function (obj) {
    var list = [];
    Object.keys(obj || {}).forEach(function (key) {
      list.push({ key: key, value: obj[key] });
    });
    return list;
  },

  initTierPricesData: function () {
    var self = this;
    if (!this.data.active_tier) {
      this.data.active_tier = 'peak';
    }
    if (!this.data.tier_prices_map) {
      this.data.tier_prices_map = {};
      var tierPricesObj = this.data.tier_prices || {};
      Object.keys(tierPricesObj).forEach(function (name) {
        self.data.tier_prices_map[name] = self.objectToList(
          tierPricesObj[name],
        );
      });
    }
    if (!this.data.tier_prices_map.peak) {
      this.data.tier_prices_map.peak = [];
    }
    if (!this.data.tier_prices_map[this.data.active_tier]) {
      this.data.tier_prices_map[this.data.active_tier] = [];
    }
    this.data.tier_prices_active =
      this.data.tier_prices_map[this.data.active_tier];
  },

  getTierLabel: function (tierName) {
    var options = MockData.modelTierOptions || [];
    var matched = options.find(function (item) {
      return item.value === tierName;
    });
    return matched ? matched.label : tierName;
  },

  renderTierSelector: function () {
    return '<span class="ivu-tag ivu-tag-warning ivu-tag-checked">忙时</span>';
  },

  listToObject: function (list) {
    var obj = {};
    (list || []).forEach(function (item) {
      if (
        item.key !== '' &&
        item.value !== '' &&
        item.value !== null &&
        item.value !== undefined
      ) {
        obj[item.key] = Number(item.value);
      }
    });
    return obj;
  },

  formatPrice: function (value, empty) {
    if (empty === undefined) empty = '-';
    if (value === null || value === undefined || value === '') return empty;
    var num = Number(String(value).trim());
    if (!isFinite(num) || num < 0) return empty;
    if (num === 0) return '0';
    var abs = Math.abs(num);
    if (abs < 1e-4 || abs >= 1e6) {
      return num
        .toExponential()
        .replace(/(\.\d*?)0+([eE])/g, '$1$2')
        .replace(/\.([eE])/g, '$1');
    }
    return num.toLocaleString('en-US', {
      useGrouping: false,
      maximumSignificantDigits: 15,
    });
  },

  formatPriceForInput: function (value) {
    if (value === null || value === undefined) return '';
    var text = String(value).trim();
    if (text === '') return '';
    var num = Number(text);
    if (!isFinite(num) || num < 0) return text;
    return this.formatPrice(num, '');
  },

  isPriceOverflow: function (value) {
    return Math.abs(Number(value) * 1e8) >= Math.pow(2, 53);
  },

  mergePriceMap: function (dst, src) {
    var merged = {};
    Object.keys(dst || {}).forEach(function (key) {
      merged[key] = dst[key];
    });
    Object.keys(src || {}).forEach(function (key) {
      merged[key] = src[key];
    });
    return merged;
  },

  mergeTierPriceMap: function (dst, src) {
    var self = this;
    var merged = {};
    Object.keys(dst || {}).forEach(function (tier) {
      merged[tier] = self.mergePriceMap(dst[tier], null);
    });
    Object.keys(src || {}).forEach(function (tier) {
      if (merged[tier]) {
        merged[tier] = self.mergePriceMap(merged[tier], src[tier]);
      } else {
        merged[tier] = src[tier];
      }
    });
    return merged;
  },

  renderPriceHint: function (isEdit) {
    var lines = [
      '可输入 1.5e-6 或 0.0000015，失焦后按量级自动格式化（小于 1e-4 或 ≥ 1e6 用科学计数法）。',
      '单价格折算 价格×1e8 不得超过 2^53（约 9e15）。',
    ];
    if (isEdit) {
      lines.push(
        '编辑提交时 prices / tier_prices 为键级合并：表单中的键覆盖原值，未出现的键保留（删除某行不会清除后端已有键）。',
      );
    }
    return '<p class="proto-price-hint">' + lines.join('<br>') + '</p>';
  },

  renderBody: function () {
    this.initTierPricesData();
    var d = this.data;
    var isView = this.isView;
    var self = this;
    var modeOptions = MockData.modelModeOptions;
    var capOptions = MockData.modelCapabilities;
    var paramOptions = MockData.modelSupportedParameters;
    var limitKeys = MockData.modelLimitKeys;
    var priceKeys = MockData.modelPriceKeys;

    var modeSelectHtml = modeOptions
      .map(function (m) {
        return (
          '<option value="' +
          m +
          '"' +
          (d.mode === m ? ' selected' : '') +
          '>' +
          m +
          '</option>'
        );
      })
      .join('');

    var capsHtml = isView
      ? d.capabilities && d.capabilities.length
        ? d.capabilities
            .map(function (c) {
              return IvuUI.tag(c, 'primary');
            })
            .join(' ')
        : '-'
      : this.renderMultiSelectDropdown(
          'capabilities',
          capOptions,
          d.capabilities || [],
          '请选择',
        );

    var paramsHtml = isView
      ? d.supported_parameters && d.supported_parameters.length
        ? d.supported_parameters
            .map(function (p) {
              return IvuUI.tag(p, 'primary');
            })
            .join(' ')
        : '-'
      : this.renderMultiSelectDropdown(
          'supported_parameters',
          paramOptions,
          d.supported_parameters || [],
          '请选择',
        );

    var limitsHtml = isView
      ? this.renderViewKvTable(d.limits)
      : this.renderDynamicList('limits', limitKeys, d.limits, '键名', '值', 0);
    var pricesHtml = isView
      ? this.renderViewPriceTable(d.prices)
      : this.renderDynamicList(
          'prices',
          priceKeys,
          d.prices,
          '价格项',
          '如 1.5e-6 或 0.0000015',
          'price',
        );
    var tierPricesHtml = isView
      ? this.renderViewTierPricesAll(d.tier_prices_map)
      : this.renderDynamicList(
          'tier_prices_active',
          priceKeys,
          d.tier_prices_active || [],
          '价格项',
          '如 1.5e-6 或 0.0000015',
          'price',
        );
    var tierSelectorHtml = this.renderTierSelector(d.active_tier || 'peak');

    var basicInfoHtml =
      '<div class="ivu-row" style="margin:0 -12px;">' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '提供商',
        isView
          ? d.provider || '-'
          : '<div class="proto-autocomplete" id="proto-provider-autocomplete">' +
              '<div class="ivu-input-wrapper ivu-input-type-text">' +
              '<input type="text" class="ivu-input" id="field-provider" value="' +
              IvuUI.escapeHtml(d.provider || '') +
              '" placeholder="输入或选择提供商名称" autocomplete="off" style="padding-right:28px;" /></div>' +
              '<i class="proto-autocomplete-arrow" aria-hidden="true">▾</i>' +
              '<div class="proto-autocomplete-dropdown" style="display:none;"></div>' +
              '</div>',
        !isView,
      ) +
      '</div>' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '模型名',
        isView
          ? d.model || '-'
          : '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input" id="field-model" value="' +
              IvuUI.escapeHtml(d.model || '') +
              '" placeholder="输入模型名" /></div>',
        !isView,
      ) +
      '</div>' +
      '</div>' +
      '<div class="ivu-row" style="margin:0 -12px;">' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '归一化模型名',
        isView
          ? d.base_model || '-'
          : '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input" id="field-base_model" value="' +
              IvuUI.escapeHtml(d.base_model || '') +
              '" placeholder="deepseek-v3" /></div>',
        !isView,
      ) +
      '</div>' +
      '<div class="ivu-col ivu-col-span-12" style="padding:0 12px;">' +
      IvuUI.formTopItem(
        '模型模式',
        isView
          ? d.mode || '-'
          : '<div class="ivu-select ivu-select-single" style="width:100%;">' +
              '<div class="ivu-select-selection">' +
              '<select id="field-mode" class="proto-ivu-select-native" style="width:100%;height:32px;border:0;background:transparent;padding:0 24px 0 8px;appearance:none;">' +
              modeSelectHtml +
              '</select>' +
              '<span class="proto-select-arrow" aria-hidden="true">▾</span>' +
              '</div></div>',
        !isView,
      ) +
      '</div>' +
      '</div>' +
      (isView
        ? '<div class="info-row"><div class="info-label">模型能力</div><div class="info-value">' +
          capsHtml +
          '</div></div>' +
          '<div class="info-row"><div class="info-label">支持参数</div><div class="info-value">' +
          paramsHtml +
          '</div></div>'
        : IvuUI.formTopItem('模型能力', capsHtml) +
          IvuUI.formTopItem('支持参数', paramsHtml));

    if (isView) {
      basicInfoHtml +=
        '<div class="info-row"><div class="info-label">创建时间</div><div class="info-value">' +
        this.formatTime(d.create_time) +
        '</div></div>' +
        '<div class="info-row"><div class="info-label">更新时间</div><div class="info-value">' +
        this.formatTime(d.update_time || d.create_time) +
        '</div></div>';
    }

    var metadataHtml = '';
    if (isView) {
      metadataHtml =
        '<div class="info-row"><div class="info-label">来源</div><div class="info-value">' +
        (d.metadata && d.metadata.source
          ? '<a href="' +
            IvuUI.escapeHtml(d.metadata.source) +
            '" target="_blank">' +
            IvuUI.escapeHtml(d.metadata.source) +
            '</a>'
          : '-') +
        '</div></div>' +
        '<div class="info-row"><div class="info-label">备注</div><div class="info-value">' +
        (d.metadata && d.metadata.notes
          ? IvuUI.escapeHtml(d.metadata.notes)
          : '-') +
        '</div></div>';
    } else {
      var sourceError = self.errors.source
        ? '<p class="error-text" style="color:#ed4014;margin-top:6px;">' +
          self.errors.source +
          '</p>'
        : '';
      metadataHtml =
        IvuUI.formTopItem(
          '来源',
          '<div class="ivu-input-wrapper ivu-input-type-text"><input type="text" class="ivu-input" id="field-meta-source" value="' +
            IvuUI.escapeHtml((d.metadata && d.metadata.source) || '') +
            '" placeholder="https://..." /></div>' +
            sourceError,
        ) +
        IvuUI.formTopItem(
          '备注',
          '<div class="ivu-input-wrapper ivu-input-type-textarea"><textarea class="ivu-input" id="field-meta-notes" rows="3">' +
            IvuUI.escapeHtml((d.metadata && d.metadata.notes) || '') +
            '</textarea></div>',
        );
    }

    var limitsError =
      !isView && self.errors.limits
        ? '<p class="error-text" style="color:#ed4014;margin-top:8px;">' +
          self.errors.limits +
          '</p>'
        : '';
    var pricesError =
      !isView && self.errors.prices
        ? '<p class="error-text" style="color:#ed4014;margin-top:8px;">' +
          self.errors.prices +
          '</p>'
        : '';
    var tierPricesError =
      !isView && self.errors.tier_prices
        ? '<p class="error-text" style="color:#ed4014;margin-top:8px;">' +
          self.errors.tier_prices +
          '</p>'
        : '';
    var batchDiscountError =
      !isView && self.errors.batch_discount
        ? '<p class="error-text" style="color:#ed4014;margin-top:8px;">' +
          self.errors.batch_discount +
          '</p>'
        : '';
    var pricingHtml = this.renderPricingSection(
      isView,
      d,
      pricesHtml,
      tierSelectorHtml,
      tierPricesHtml,
      pricesError,
      tierPricesError,
      batchDiscountError,
    );

    return (
      IvuUI.card('基础信息', basicInfoHtml) +
      IvuUI.card('限制对象', limitsHtml + limitsError) +
      IvuUI.card('价格', pricingHtml) +
      IvuUI.card('元数据', metadataHtml)
    );
  },

  renderPricingSection: function (
    isView,
    d,
    pricesHtml,
    tierSelectorHtml,
    tierPricesHtml,
    pricesError,
    tierPricesError,
    batchDiscountError,
  ) {
    if (isView) {
      var batchDiscountView =
        d.mode === 'batch'
          ? '-（mode=batch 的价格行不配置批量折扣系数）'
          : this.formatPrice(d.batch_discount);
      return (
        '<div class="info-row"><div class="info-label">默认价格</div><div class="info-value">' +
        pricesHtml +
        '</div></div>' +
        '<div class="info-row"><div class="info-label">分时段价格</div><div class="info-value">' +
        tierPricesHtml +
        '</div></div>' +
        '<div class="info-row"><div class="info-label">批量折扣系数</div><div class="info-value">' +
        batchDiscountView +
        '</div></div>'
      );
    }
    var batchDiscountBlock =
      d.mode === 'batch'
        ? ''
        : '<div class="proto-price-config-block">' +
          '<div class="proto-price-config-header">' +
          '<span class="proto-price-config-title">批量折扣系数</span>' +
          '<span class="proto-price-config-help" title="导出时将本行各 token 价格键 × 系数展开生成 (provider, model, mode=batch) 价格行随 ModelTable 下发；tier 价逐档展开；手工维护的 mode=batch 行优先于系数展开。">?</span>' +
          '</div>' +
          '<div class="proto-price-config-body">' +
          '<div class="ivu-input-number ivu-input-number-default" style="width:200px;">' +
          '<div class="ivu-input-number-input-wrap">' +
          '<input type="number" class="ivu-input-number-input" id="field-batch_discount" value="' +
          IvuUI.escapeHtml(this.formatPriceForInput(d.batch_discount)) +
          '" placeholder="0.5" min="0" max="1" step="0.1" />' +
          '</div></div>' +
          batchDiscountError +
          '</div></div>';
    return (
      '<div class="proto-price-config-group">' +
      '<div class="proto-price-config-block">' +
      '<div class="proto-price-config-header">' +
      '<span class="proto-price-config-title is-required">默认价格</span>' +
      '<span class="proto-price-config-help" title="科学计数法与十进制等价合法（如 1.5e-6 与 0.0000015）。编辑时未提交的价格键保留原值。">?</span>' +
      '</div>' +
      '<div class="proto-price-config-body">' +
      this.renderPriceHint(!!d.id) +
      pricesHtml +
      pricesError +
      '</div></div>' +
      '<div class="proto-price-config-block">' +
      '<div class="proto-price-config-header">' +
      '<span class="proto-price-config-title">分时段价格' +
      '<span class="proto-price-config-help" title="分时段价格配置专属的价格；不在这些时段内时将使用默认价格，可选填。科学计数法与十进制等价合法。">?</span>' +
      '</span></div>' +
      '<div class="proto-price-config-body">' +
      '<div class="proto-tier-meta-row">' +
      '<span class="proto-tier-meta-label">时段对象</span>' +
      tierSelectorHtml +
      '</div>' +
      tierPricesHtml +
      tierPricesError +
      '</div></div>' +
      batchDiscountBlock +
      '</div>'
    );
  },

  renderViewTierPricesAll: function (tierPricesMap) {
    var self = this;
    var tierNames = Object.keys(tierPricesMap || {}).filter(function (name) {
      var list = tierPricesMap[name];
      return list && list.length;
    });
    if (!tierNames.length) {
      return '-';
    }
    return tierNames
      .map(function (name) {
        return (
          '<div class="proto-tier-price-view">' +
          '<div class="proto-tier-price-view-label">时段对象：' +
          self.getTierLabel(name) +
          '</div>' +
          self.renderViewPriceTable(tierPricesMap[name]) +
          '</div>'
        );
      })
      .join('');
  },

  renderMultiSelect: function (field, options, selected, label) {
    var selectedMap = {};
    (selected || []).forEach(function (s) {
      selectedMap[s] = true;
    });

    var optionsHtml = options
      .map(function (opt) {
        return (
          '<label style="display:inline-block;margin:4px 12px 4px 0;cursor:pointer;">' +
          '<input type="checkbox" class="proto-multi-opt" data-field="' +
          field +
          '" value="' +
          opt +
          '"' +
          (selectedMap[opt] ? ' checked' : '') +
          ' style="margin-right:4px;" /> ' +
          opt +
          '</label>'
        );
      })
      .join('');

    return (
      '<div class="proto-multi-select" data-multi-field="' +
      field +
      '" style="padding:8px;border:1px solid #dcdee2;border-radius:4px;max-height:120px;overflow-y:auto;">' +
      optionsHtml +
      '</div>'
    );
  },

  renderMultiSelectDropdown: function (field, options, selected, placeholder) {
    var selectedMap = {};
    (selected || []).forEach(function (s) {
      selectedMap[s] = true;
    });

    var displayText =
      selected && selected.length
        ? selected.join(', ')
        : placeholder || '请选择';

    var optionsHtml = options
      .map(function (opt) {
        return (
          '<label class="proto-multi-dropdown-opt">' +
          '<input type="checkbox" class="proto-multi-opt" data-field="' +
          field +
          '" value="' +
          opt +
          '"' +
          (selectedMap[opt] ? ' checked' : '') +
          ' /> ' +
          opt +
          '</label>'
        );
      })
      .join('');

    return (
      '<div class="proto-multi-dropdown" data-multi-field="' +
      field +
      '" data-placeholder="' +
      IvuUI.escapeHtml(placeholder || '请选择') +
      '">' +
      '<div class="proto-multi-dropdown-trigger">' +
      '<span class="proto-multi-dropdown-text">' +
      IvuUI.escapeHtml(displayText) +
      '</span>' +
      '<span class="proto-multi-dropdown-arrow">▾</span>' +
      '</div>' +
      '<div class="proto-multi-dropdown-menu">' +
      optionsHtml +
      '</div>' +
      '</div>'
    );
  },

  renderDynamicList: function (
    field,
    keyOptions,
    items,
    keyPlaceholder,
    valuePlaceholder,
    valueMode,
  ) {
    var self = this;
    var isPrice = valueMode === 'price' || valueMode === 8;
    var rowsHtml = items
      .map(function (item, index) {
        var selectOptions = keyOptions
          .map(function (k) {
            return (
              '<option value="' +
              k +
              '"' +
              (item.key === k ? ' selected' : '') +
              '>' +
              k +
              '</option>'
            );
          })
          .join('');
        var displayValue = isPrice
          ? self.formatPriceForInput(item.value)
          : item.value != null && item.value !== ''
          ? item.value
          : 0;
        var valueInput = isPrice
          ? '<div class="ivu-input-wrapper ivu-input-type-text" style="width:100%;">' +
            '<input type="text" class="ivu-input proto-dynamic-value" data-field="' +
            field +
            '" data-index="' +
            index +
            '" value="' +
            IvuUI.escapeHtml(String(displayValue)) +
            '" placeholder="' +
            IvuUI.escapeHtml(valuePlaceholder) +
            '" />' +
            '</div>'
          : '<div class="ivu-input-number ivu-input-number-default" style="width:100%;">' +
            '<div class="ivu-input-number-input-wrap">' +
            '<input type="number" class="ivu-input-number-input proto-dynamic-value" data-field="' +
            field +
            '" data-index="' +
            index +
            '" value="' +
            displayValue +
            '" placeholder="' +
            IvuUI.escapeHtml(valuePlaceholder) +
            '" min="0" step="1" />' +
            '</div></div>';
        return (
          '<div class="proto-dynamic-row" data-row-index="' +
          index +
          '">' +
          '<div class="ivu-row" style="margin:0 -4px;">' +
          '<div class="ivu-col ivu-col-span-10" style="padding:0 4px;">' +
          '<div class="ivu-select ivu-select-single" style="width:100%;">' +
          '<div class="ivu-select-selection">' +
          '<select class="proto-dynamic-key proto-ivu-select-native" data-field="' +
          field +
          '" data-index="' +
          index +
          '" style="width:100%;height:32px;border:0;background:transparent;padding:0 24px 0 8px;appearance:none;">' +
          '<option value="">' +
          keyPlaceholder +
          '</option>' +
          selectOptions +
          '</select>' +
          '<span class="proto-select-arrow" aria-hidden="true">▾</span>' +
          '</div></div>' +
          '</div>' +
          '<div class="ivu-col ivu-col-span-10" style="padding:0 4px;">' +
          valueInput +
          '</div>' +
          '<div class="ivu-col ivu-col-span-4" style="padding:0 4px;">' +
          '<button type="button" class="ivu-btn ivu-btn-error ivu-btn-small proto-dynamic-delete" data-field="' +
          field +
          '" data-index="' +
          index +
          '" style="width:100%;">删除</button>' +
          '</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    var addLabel =
      field === 'limits'
        ? '+ 添加限制'
        : field === 'tier_prices_active'
        ? '+ 添加价格'
        : field === 'prices'
        ? '+ 添加价格'
        : '+ 添加价格';
    return (
      rowsHtml +
      '<button type="button" class="ivu-btn ivu-btn-primary proto-dynamic-add" data-field="' +
      field +
      '" style="margin-top:4px;">' +
      addLabel +
      '</button>'
    );
  },

  renderViewKvTable: function (items) {
    if (!items || !items.length) return '-';
    var rows = items
      .map(function (item) {
        return (
          '<tr>' +
          '<td style="padding:8px 16px;border:1px solid #e7e9f0;word-break:break-all;width:50%;background:#f8f8f9;">' +
          item.key +
          '</td>' +
          '<td style="padding:8px 16px;border:1px solid #e7e9f0;word-break:break-all;">' +
          item.value +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
    return (
      '<table class="kv-table" style="width:100%;border-collapse:collapse;border:1px solid #e7e9f0;"><tbody>' +
      rows +
      '</tbody></table>'
    );
  },

  renderViewPriceTable: function (items) {
    if (!items || !items.length) return '-';
    var self = this;
    var rows = items
      .map(function (item) {
        return (
          '<tr>' +
          '<td style="padding:8px 16px;border:1px solid #e7e9f0;word-break:break-all;width:50%;background:#f8f8f9;">' +
          item.key +
          '</td>' +
          '<td style="padding:8px 16px;border:1px solid #e7e9f0;word-break:break-all;">¥' +
          self.formatPrice(item.value) +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
    return (
      '<table class="kv-table" style="width:100%;border-collapse:collapse;border:1px solid #e7e9f0;"><tbody>' +
      rows +
      '</tbody></table>'
    );
  },

  renderFooter: function () {
    return (
      '<button type="button" class="ivu-btn ivu-btn-primary" id="btn-model-price-submit">提交</button>' +
      '<button type="button" class="ivu-btn" data-close-drawer="' +
      this.drawerId +
      '" style="margin-left:8px;">取消</button>'
    );
  },

  formatTime: function (ts) {
    if (!ts) return '-';
    try {
      var date = new Date(ts * 1000);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('zh-CN');
    } catch (e) {
      return ts;
    }
  },

  validateUrl: function (value) {
    var urlPattern =
      /^(https?:\/\/)?(([\w-]+\.)+[\w-]+|localhost)(:\d+)?(\/[\w.\/?%&=-]*)?$/i;
    return urlPattern.test(value);
  },

  getDuplicateKeys: function (list) {
    var seen = {};
    var duplicates = [];
    (list || []).forEach(function (item) {
      var key = item.key;
      if (!key) return;
      if (seen[key] && duplicates.indexOf(key) === -1) {
        duplicates.push(key);
      }
      seen[key] = true;
    });
    return duplicates;
  },

  validateTierPrices: function () {
    var self = this;
    var tierMsg = '';
    Object.keys(this.data.tier_prices_map || {}).forEach(function (tierName) {
      if (tierMsg) return;
      var list = self.data.tier_prices_map[tierName] || [];
      var tierLabel = self.getTierLabel(tierName);
      if (self.getDuplicateKeys(list).length > 0) {
        tierMsg = tierLabel + ' 的分时段价格存在重复的键';
        return;
      }
      var valueInvalid = list.some(function (item) {
        if (!item.key) return false;
        var value = Number(item.value);
        return isNaN(value) || value < 0;
      });
      if (valueInvalid) {
        tierMsg = tierLabel + ' 的分时段价格的值必须为非负数';
        return;
      }
      var overflow = list.some(function (item) {
        if (!item.key) return false;
        return self.isPriceOverflow(item.value);
      });
      if (overflow) {
        tierMsg =
          tierLabel + ' 的分时段价格过大：价格 × 1e8 不得超过 2^53（约 9e15）';
      }
    });
    return tierMsg;
  },

  validateDynamicKeys: function () {
    var self = this;
    var limitsDuplicates = this.getDuplicateKeys(this.data.limits);
    var pricesDuplicates = this.getDuplicateKeys(this.data.prices);
    var limitsMsg = '';
    var pricesMsg = '';
    var tierMsg = this.validateTierPrices();

    if (limitsDuplicates.length > 0) {
      limitsMsg = '限制对象存在重复的键';
    }
    if (pricesDuplicates.length > 0) {
      pricesMsg = '默认价格存在重复的键';
    }

    // limits 值须为非负整数；prices 值须为非负数，且不超过 float64 计费上限
    var limitsValueInvalid = this.data.limits.some(function (item) {
      if (!item.key) return false;
      var value = Number(item.value);
      return isNaN(value) || value < 0 || Math.floor(value) !== value;
    });
    var pricesValueInvalid = this.data.prices.some(function (item) {
      if (!item.key) return false;
      var value = Number(item.value);
      return isNaN(value) || value < 0;
    });
    var pricesOverflow = this.data.prices.some(function (item) {
      if (!item.key) return false;
      var value = Number(item.value);
      if (isNaN(value) || value < 0) return false;
      return self.isPriceOverflow(value);
    });

    if (!limitsMsg && limitsValueInvalid) {
      limitsMsg = '限制对象的值必须为非负整数';
    }
    if (!pricesMsg && pricesValueInvalid) {
      pricesMsg = '默认价格的值必须为非负数';
    }
    if (!pricesMsg && pricesOverflow) {
      pricesMsg = '默认价格过大：价格 × 1e8 不得超过 2^53（约 9e15）';
    }

    this.errors.limits = limitsMsg;
    this.errors.prices = pricesMsg;
    this.errors.tier_prices = tierMsg;

    if (limitsMsg || pricesMsg || tierMsg) {
      this.refreshBody();
      Prototype.toast(limitsMsg || pricesMsg || tierMsg, 'error');
      return false;
    }
    return true;
  },

  bindEvents: function () {
    var self = this;
    var drawer = document.getElementById(this.drawerId);
    if (!drawer) return;

    // 提供商：下拉可选 + 可手动输入（AutoComplete）
    var providerWrap = document.getElementById('proto-provider-autocomplete');
    var providerEl = document.getElementById('field-provider');
    if (providerWrap && providerEl) {
      var providerDropdown = providerWrap.querySelector(
        '.proto-autocomplete-dropdown',
      );

      function renderProviderDropdown(filter) {
        var names = MockData.getProviderNames() || [];
        var kw = (filter || '').toLowerCase();
        var filtered = kw
          ? names.filter(function (n) {
              return n.toLowerCase().indexOf(kw) !== -1;
            })
          : names;
        if (!filtered.length) {
          providerDropdown.innerHTML =
            '<div class="proto-autocomplete-empty">无匹配项</div>';
        } else {
          providerDropdown.innerHTML = filtered
            .map(function (n) {
              return (
                '<div class="proto-autocomplete-option" data-value="' +
                IvuUI.escapeHtml(n) +
                '">' +
                IvuUI.escapeHtml(n) +
                '</div>'
              );
            })
            .join('');
        }
        providerDropdown.style.display = 'block';
      }

      function applyProvider(value) {
        var newProvider = (value || '').trim();
        if (self.data.provider !== newProvider) {
          self.data.provider = newProvider;
          self.refreshBody();
        } else {
          providerDropdown.style.display = 'none';
        }
      }

      providerEl.addEventListener('focus', function () {
        renderProviderDropdown(providerEl.value);
      });
      providerEl.addEventListener('input', function () {
        renderProviderDropdown(providerEl.value);
      });
      providerEl.addEventListener('blur', function () {
        setTimeout(function () {
          providerDropdown.style.display = 'none';
          applyProvider(providerEl.value);
        }, 150);
      });
      providerEl.addEventListener('change', function () {
        applyProvider(providerEl.value);
      });
      providerDropdown.addEventListener('mousedown', function (e) {
        var opt = e.target.closest('.proto-autocomplete-option');
        if (!opt) return;
        e.preventDefault();
        providerEl.value = opt.getAttribute('data-value');
        applyProvider(providerEl.value);
      });
    }

    // 动态列表添加
    drawer.querySelectorAll('.proto-dynamic-add').forEach(function (btn) {
      btn.onclick = function () {
        var field = btn.getAttribute('data-field');
        self.data[field].push({
          key: '',
          value: field === 'limits' ? 0 : '',
        });
        self.refreshBody();
      };
    });

    // 动态列表删除
    drawer.querySelectorAll('.proto-dynamic-delete').forEach(function (btn) {
      btn.onclick = function () {
        var field = btn.getAttribute('data-field');
        var index = parseInt(btn.getAttribute('data-index'), 10);
        self.data[field].splice(index, 1);
        self.refreshBody();
      };
    });

    // 动态列表key变化
    drawer.querySelectorAll('.proto-dynamic-key').forEach(function (sel) {
      sel.onchange = function () {
        var field = sel.getAttribute('data-field');
        var index = parseInt(sel.getAttribute('data-index'), 10);
        self.data[field][index].key = sel.value;
      };
    });

    // 动态列表value变化：价格保留原始文本（支持 1.5e-6），限制对象仍按数字解析
    drawer.querySelectorAll('.proto-dynamic-value').forEach(function (input) {
      var field = input.getAttribute('data-field');
      var index = parseInt(input.getAttribute('data-index'), 10);
      var isPriceField =
        field === 'prices' || field === 'tier_prices_active';
      input.oninput = function () {
        if (isPriceField) {
          self.data[field][index].value = input.value;
          return;
        }
        var val = parseFloat(input.value);
        self.data[field][index].value = isNaN(val) ? 0 : val;
      };
      if (isPriceField) {
        input.onblur = function () {
          var formatted = self.formatPriceForInput(input.value);
          self.data[field][index].value = formatted;
          input.value = formatted;
        };
      }
    });

    // 多选下拉展开/收起
    drawer
      .querySelectorAll('.proto-multi-dropdown-trigger')
      .forEach(function (trigger) {
        trigger.onclick = function (e) {
          e.stopPropagation();
          var dropdown = trigger.closest('.proto-multi-dropdown');
          if (dropdown) {
            dropdown.classList.toggle('open');
          }
        };
      });
    document.addEventListener('click', function (e) {
      drawer
        .querySelectorAll('.proto-multi-dropdown.open')
        .forEach(function (dropdown) {
          if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
          }
        });
    });

    // 多选
    drawer.querySelectorAll('.proto-multi-opt').forEach(function (cb) {
      cb.onchange = function () {
        var field = cb.getAttribute('data-field');
        var checked = [];
        drawer
          .querySelectorAll(
            '.proto-multi-opt[data-field="' + field + '"]:checked',
          )
          .forEach(function (c) {
            checked.push(c.value);
          });
        self.data[field] = checked;
        var dropdown = cb.closest('.proto-multi-dropdown');
        if (dropdown) {
          var triggerText = dropdown.querySelector(
            '.proto-multi-dropdown-text',
          );
          var placeholder =
            dropdown.getAttribute('data-placeholder') || '请选择';
          if (triggerText) {
            triggerText.textContent = checked.length
              ? checked.join(', ')
              : placeholder;
          }
        }
      };
    });

    // 模型模式：切换后刷新表单（控制批量折扣系数字段的展示）
    var modeEl = document.getElementById('field-mode');
    if (modeEl) {
      modeEl.onchange = function () {
        if (self.data.mode !== modeEl.value) {
          self.data.mode = modeEl.value;
          self.refreshBody();
        }
      };
    }

    // 批量折扣系数：输入同步到 data，便于校验失败刷新后保留
    var batchDiscountEl = document.getElementById('field-batch_discount');
    if (batchDiscountEl) {
      batchDiscountEl.oninput = function () {
        self.data.batch_discount = batchDiscountEl.value;
      };
    }

    // 提交
    var submitBtn = document.getElementById('btn-model-price-submit');
    if (submitBtn) {
      submitBtn.onclick = function () {
        self.handleSubmit();
      };
    }
  },

  refreshBody: function () {
    var drawer = document.getElementById(this.drawerId);
    if (!drawer) return;
    var bodyEl = drawer.querySelector('.ivu-drawer-body');
    if (bodyEl) bodyEl.innerHTML = this.renderBody();
    this.bindEvents();
  },

  handleSubmit: function () {
    var self = this;
    var d = this.data;
    this.errors = {
      source: '',
      limits: '',
      prices: '',
      tier_prices: '',
      batch_discount: '',
    };

    // 收集表单值
    var providerEl = document.getElementById('field-provider');
    var modelEl = document.getElementById('field-model');
    var baseModelEl = document.getElementById('field-base_model');
    var modeEl = document.getElementById('field-mode');
    var batchDiscountEl = document.getElementById('field-batch_discount');
    var metaSourceEl = document.getElementById('field-meta-source');
    var metaNotesEl = document.getElementById('field-meta-notes');

    if (providerEl) d.provider = providerEl.value.trim();
    if (modelEl) d.model = modelEl.value.trim();
    if (baseModelEl) d.base_model = baseModelEl.value.trim();
    if (modeEl) d.mode = modeEl.value;
    if (batchDiscountEl) d.batch_discount = batchDiscountEl.value.trim();
    if (!d.metadata) d.metadata = {};
    if (metaSourceEl) d.metadata.source = metaSourceEl.value.trim();
    if (metaNotesEl) d.metadata.notes = metaNotesEl.value;

    // 必填校验
    if (!d.provider) {
      Prototype.toast('请输入提供商', 'error');
      return;
    }
    if (d.provider.length > 255) {
      Prototype.toast('提供商长度不能超过 255', 'error');
      return;
    }
    if (!d.model) {
      Prototype.toast('请输入模型名', 'error');
      return;
    }
    if (d.model.length > 255) {
      Prototype.toast('模型名长度不能超过 255', 'error');
      return;
    }
    if (!d.base_model) {
      Prototype.toast('请输入归一化模型名', 'error');
      return;
    }
    if (d.base_model.length > 255) {
      Prototype.toast('归一化模型名长度不能超过 255', 'error');
      return;
    }
    if (!d.mode) {
      Prototype.toast('请选择模型模式', 'error');
      return;
    }

    // 批量折扣系数校验：mode=batch 的价格行不配置本字段；
    // 其余模式非必填，填写时须为 (0,1] 浮点数（0、负数、>1 均非法）
    if (
      d.mode !== 'batch' &&
      d.batch_discount !== '' &&
      d.batch_discount != null
    ) {
      var batchDiscountNum = Number(d.batch_discount);
      if (
        isNaN(batchDiscountNum) ||
        batchDiscountNum <= 0 ||
        batchDiscountNum > 1
      ) {
        this.errors.batch_discount =
          '批量折扣系数必须为 (0,1] 区间内的浮点数';
        this.refreshBody();
        Prototype.toast(
          '批量折扣系数必须为 (0,1] 区间内的浮点数',
          'error',
        );
        return;
      }
      d.batch_discount = batchDiscountNum;
    } else {
      d.batch_discount = null;
    }

    // 来源 URL 校验
    if (d.metadata.source && !this.validateUrl(d.metadata.source)) {
      this.errors.source = '请输入正确的 URL 地址';
      this.refreshBody();
      Prototype.toast('请输入正确的 URL 地址', 'error');
      return;
    }

    // 动态列表校验
    if (!this.validateDynamicKeys()) {
      return;
    }

    // 校验默认价格至少一项
    var priceObj = this.listToObject(d.prices);
    if (Object.keys(priceObj).length === 0) {
      this.errors.prices = '请至少添加一项默认价格';
      this.refreshBody();
      Prototype.toast('请至少添加一项默认价格', 'error');
      return;
    }

    // 编辑模式下 provider/model/mode 均未改动，跳过组合唯一性校验
    var isEdit = !!d.id;
    var orig = null;
    if (isEdit) {
      orig = MockData.modelPrices.find(function (p) {
        return p.id === d.id;
      });
    }
    var unchanged =
      isEdit &&
      orig &&
      orig.provider === d.provider &&
      orig.model === d.model &&
      orig.mode === d.mode;

    if (!unchanged) {
      var duplicate = MockData.modelPrices.find(function (p) {
        return (
          p.id !== d.id &&
          p.provider === d.provider &&
          p.model === d.model &&
          p.mode === d.mode
        );
      });
      if (duplicate) {
        Prototype.toast(
          '已存在相同提供商、模型名、模型模式的价格配置',
          'error',
        );
        return;
      }
    }

    // 构建提交数据
    var payload = {
      provider: d.provider,
      model: d.model,
      base_model: d.base_model,
      mode: d.mode,
      capabilities: d.capabilities || [],
      supported_parameters: d.supported_parameters || [],
      limits: this.listToObject(d.limits),
      prices: priceObj,
      metadata: d.metadata || {},
    };
    if (d.mode !== 'batch' && d.batch_discount != null) {
      payload.batch_discount = d.batch_discount;
    }
    var tierPrices = {};
    Object.keys(d.tier_prices_map || {}).forEach(function (tierName) {
      var tierObj = self.listToObject(d.tier_prices_map[tierName]);
      if (Object.keys(tierObj).length > 0) {
        tierPrices[tierName] = tierObj;
      }
    });
    if (Object.keys(tierPrices).length > 0) {
      payload.tier_prices = tierPrices;
    } else {
      payload.tier_prices = undefined;
    }

    if (d.id) {
      var idx = MockData.modelPrices.findIndex(function (p) {
        return p.id === d.id;
      });
      if (idx >= 0) {
        var existing = MockData.modelPrices[idx];
        payload.id = d.id;
        payload.create_time = existing.create_time;
        payload.update_time = Math.floor(Date.now() / 1000);
        payload.prices = self.mergePriceMap(existing.prices, priceObj);
        if (payload.tier_prices) {
          payload.tier_prices = self.mergeTierPriceMap(
            existing.tier_prices,
            payload.tier_prices,
          );
        } else {
          payload.tier_prices = existing.tier_prices;
        }
        MockData.modelPrices[idx] = payload;
      }
      Prototype.toast('编辑成功!');
    } else {
      // 创建
      var maxId = 0;
      MockData.modelPrices.forEach(function (p) {
        if (p.id > maxId) maxId = p.id;
      });
      payload.id = maxId + 1;
      payload.create_time = Math.floor(Date.now() / 1000);
      payload.update_time = payload.create_time;
      MockData.modelPrices.push(payload);
      Prototype.toast('创建成功!');
    }

    Prototype.closeDrawer(this.drawerId);
    if (typeof this.onSuccess === 'function') {
      this.onSuccess();
    }
  },
};
