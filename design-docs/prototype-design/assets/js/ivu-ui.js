window.IvuUI = {
  btn(label, type, size, extraClass, attrs) {
    type = type || 'default';
    size = size ? ' ivu-btn-' + size : '';
    extraClass = extraClass ? ' ' + extraClass : '';
    attrs = attrs || '';
    return '<button type="button" class="ivu-btn ivu-btn-' + type + size + extraClass + '" ' + attrs + '>' +
      '<span>' + label + '</span></button>';
  },

  tag(label, type) {
    type = type || 'default';
    return '<span class="ivu-tag ivu-tag-' + type + ' ivu-tag-checked"><span class="ivu-tag-text">' + label + '</span></span>';
  },

  formItem(label, content, required) {
    var req = required ? ' ivu-form-item-required' : '';
    return '<div class="ivu-form-item' + req + '">' +
      '<label class="ivu-form-item-label">' + label + '</label>' +
      '<div class="ivu-form-item-content">' + content + '</div></div>';
  },

  formTopItem(label, content, required) {
    var req = required ? ' ivu-form-item-required' : '';
    return '<div class="ivu-form-item' + req + '">' +
      '<label class="ivu-form-item-label" style="float:none;display:block;text-align:left;padding:0 0 8px;">' + label + '</label>' +
      '<div class="ivu-form-item-content" style="margin-left:0!important;">' + content + '</div></div>';
  },

  formTop(content) {
    return '<div class="ivu-form ivu-form-label-top">' + content + '</div>';
  },

  inputNumber(value, attrs) {
    attrs = attrs || '';
    return '<div class="ivu-input-number ivu-input-number-default from-item-inp" style="width:100%;">' +
      '<div class="ivu-input-number-input-wrap">' +
      '<input type="number" class="ivu-input-number-input" value="' + (value != null ? value : '') + '" ' + attrs + ' />' +
      '</div></div>';
  },

  textarea(value, rows, attrs) {
    rows = rows || 4;
    attrs = attrs || '';
    return '<div class="ivu-input-wrapper ivu-input-type-textarea">' +
      '<textarea class="ivu-input" rows="' + rows + '" ' + attrs + '>' + IvuUI.escapeHtml(value || '') + '</textarea></div>';
  },

  clusterSteps(stepDefs, currentIndex) {
    return stepDefs.map(function (step, index) {
      var cls = 'ivu-steps-item';
      if (index < currentIndex) cls += ' ivu-steps-status-finish';
      else if (index === currentIndex) cls += ' ivu-steps-status-process';
      else cls += ' ivu-steps-status-wait';
      var title = index === currentIndex ? '进行中' : (index > currentIndex ? '待进行' : '已完成');
      return '<div class="' + cls + '">' +
        '<div class="ivu-steps-tail"><i></i></div>' +
        '<div class="ivu-steps-head"><div class="ivu-steps-head-inner"><span>' + (index + 1) + '</span></div></div>' +
        '<div class="ivu-steps-main"><div class="ivu-steps-title">' + title + '</div>' +
        '<div class="ivu-steps-content">' + step.content + '</div></div></div>';
    }).join('');
  },

  stepsVertical(stepDefs, currentIndex) {
    return IvuUI.clusterSteps(stepDefs, currentIndex);
  },

  input(value, placeholder, error) {
    var cls = 'ivu-input' + (error ? ' ivu-input-error' : '');
    return '<div class="ivu-input-wrapper ivu-input-type-text">' +
      '<input type="text" class="' + cls + '" value="' + (value || '') + '" placeholder="' + (placeholder || '') + '" /></div>';
  },

  select(options, selected) {
    var html = options.map(function (opt) {
      var sel = opt === selected ? ' selected' : '';
      return '<option' + sel + '>' + opt + '</option>';
    }).join('');
    return '<div class="ivu-select ivu-select-single"><div class="ivu-select-selection">' +
      '<select class="ivu-select-selected-value" style="width:100%;height:32px;border:1px solid #dcdee2;border-radius:4px;padding:0 8px;">' +
      html + '</select></div></div>';
  },

  clusterSelect(id, options, selected, extraClass) {
    extraClass = extraClass || 'cluster-select';
    var html = (options || []).map(function (name) {
      return '<option value="' + IvuUI.escapeHtml(name) + '"' + (name === selected ? ' selected' : '') + '>' +
        IvuUI.escapeHtml(name) + '</option>';
    }).join('');
    return '<div class="ivu-select ivu-select-single ' + extraClass + '">' +
      '<div class="ivu-select-selection">' +
      '<select id="' + id + '" class="proto-ivu-select-native" style="width:100%;height:32px;border:0;background:transparent;padding:0 24px 0 8px;appearance:none;-webkit-appearance:none;">' +
      html +
      '</select>' +
      '<span class="proto-select-arrow" aria-hidden="true">▾</span>' +
      '</div></div>';
  },

  expressionEditor(textareaId) {
    var groups = IvuUI._expressionGroups;
    var rows = groups.map(function (group) {
      var buttons = group.buttons.map(function (btn) {
        return '<div class="vars-expression-show proto-expression-btn" data-expression-snippet="' +
          IvuUI.escapeHtml(btn.snippet) + '" title="' + IvuUI.escapeHtml(btn.title || btn.name) + '">' +
          IvuUI.escapeHtml(btn.name) + '</div>';
      }).join('');
      return '<div class="expression-item">' +
        '<div class="expression-item-box">' +
          '<div class="title">' + IvuUI.escapeHtml(group.name) + '</div>' +
          '<div class="expression-item-body">' + buttons + '</div>' +
        '</div></div>';
    }).join('');
    return '<div class="expression proto-expression-editor" data-expression-root>' + rows +
      '<div class="ivu-input-wrapper ivu-input-type-textarea">' +
        '<textarea id="' + textareaId + '" class="ivu-input proto-expression-input" rows="6"></textarea>' +
      '</div>' +
      '<div class="error proto-expression-error proto-hidden-inline"></div>' +
    '</div>';
  },

  initExpressionEditor(root) {
    var container = typeof root === 'string' ? document.querySelector(root) : root;
    if (!container) return;
    var textarea = container.querySelector('textarea');
    container.querySelectorAll('[data-expression-snippet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!textarea) return;
        textarea.value += btn.getAttribute('data-expression-snippet');
        textarea.focus();
      });
    });
  },

  _expressionGroups: [
    { name: '逻辑连接符:', buttons: [
      { name: '(', snippet: '(' }, { name: ')', snippet: ')' }, { name: '&&', snippet: '&&' },
      { name: '||', snippet: '||' }, { name: '!', snippet: '!' }
    ]},
    { name: 'host:', buttons: [{ name: 'in', snippet: 'req_host_in("")', title: 'req_host_in(patterns)' }] },
    { name: 'port:', buttons: [{ name: 'in', snippet: 'req_port_in("")', title: 'req_port_in(patterns)' }] },
    { name: 'method:', buttons: [{ name: 'in', snippet: 'req_method_in("")', title: 'req_method_in(patterns)' }] },
    { name: 'path:', buttons: [
      { name: 'in', snippet: 'req_path_in("", false)', title: 'req_path_in(patterns, case_insensitive)' },
      { name: 'prefix_in', snippet: 'req_path_prefix_in("", false)', title: 'req_path_prefix_in(patterns, case_insensitive)' },
      { name: 'suffix_in', snippet: 'req_path_suffix_in("", false)', title: 'req_path_suffix_in(patterns, case_insensitive)' }
    ]},
    { name: 'query:', buttons: [
      { name: 'exist', snippet: 'req_query_exist()', title: 'req_query_exist()' },
      { name: 'key_in', snippet: 'req_query_key_in("")', title: 'req_query_key_in(patterns)' },
      { name: 'key_prefix_in', snippet: 'req_query_key_prefix_in("")', title: 'req_query_key_prefix_in(patterns)' },
      { name: 'value_in', snippet: 'req_query_value_in("", "", false)', title: 'req_query_value_in(key, patterns, case_insensitive)' },
      { name: 'value_prefix_in', snippet: 'req_query_value_prefix_in("", "", false)', title: 'req_query_value_prefix_in(key, patterns, case_insensitive)' },
      { name: 'value_suffix_in', snippet: 'req_query_value_suffix_in("", "", false)', title: 'req_query_value_suffix_in(key, patterns, case_insensitive)' },
      { name: 'value_hash_in', snippet: 'req_query_value_hash_in("", "", false)', title: 'req_query_value_hash_in(key, patterns, case_insensitive)' }
    ]},
    { name: 'cookie:', buttons: [
      { name: 'key_in', snippet: 'req_cookie_key_in("")', title: 'req_cookie_key_in(patterns)' },
      { name: 'value_in', snippet: 'req_cookie_value_in("", "", false)', title: 'req_cookie_value_in(key, patterns, case_insensitive)' },
      { name: 'value_prefix_in', snippet: 'req_cookie_value_prefix_in("", "", false)', title: 'req_cookie_value_prefix_in(key, patterns, case_insensitive)' },
      { name: 'value_suffix_in', snippet: 'req_cookie_value_suffix_in("", "", false)', title: 'req_cookie_value_suffix_in(key, patterns, case_insensitive)' },
      { name: 'value_hash_in', snippet: 'req_cookie_value_hash_in("", "", false)', title: 'req_cookie_value_hash_in(key, patterns, case_insensitive)' }
    ]},
    { name: 'header:', buttons: [
      { name: 'key_in', snippet: 'req_header_key_in("")', title: 'req_header_key_in(patterns)' },
      { name: 'value_in', snippet: 'req_header_value_in("", "", false)', title: 'req_header_value_in(header_name, patterns, case_insensitive)' },
      { name: 'value_prefix_in', snippet: 'req_header_value_prefix_in("", "", false)', title: 'req_header_value_prefix_in(header_name, patterns, case_insensitive)' },
      { name: 'value_suffix_in', snippet: 'req_header_value_suffix_in("", "", false)', title: 'req_header_value_suffix_in(header_name, patterns, case_insensitive)' },
      { name: 'value_hash_in', snippet: 'req_header_value_hash_in("", "", false)', title: 'req_header_value_hash_in(key, patterns, case_insensitive)' }
    ]},
    { name: 'clientIP:', buttons: [
      { name: 'range', snippet: 'req_cip_range("", "")', title: 'req_cip_range(start, end)' },
      { name: 'trusted', snippet: 'req_cip_trusted()', title: 'req_cip_trusted()' },
      { name: 'hash_in', snippet: 'req_cip_hash_in("")', title: 'req_cip_hash_in(patterns)' }
    ]},
    { name: 'proto:', buttons: [{ name: 'secure', snippet: 'req_proto_secure()', title: 'req_proto_secure()' }] },
    { name: 'system:', buttons: [
      { name: 'bfe_time_range', snippet: 'bfe_time_range("", "")', title: 'bfe_time_range(start_time, end_time)' },
      { name: 'bfe_cluster_in', snippet: 'bfe_cluster_in("")', title: 'bfe_cluster_in(patterns)' }
    ]},
    { name: 'body:', buttons: [
      { name: 'req_body_json_in', snippet: 'req_body_json_in("","",false)', title: 'req_body_json_in(jsonpath, patterns, foldCase)' },
      { name: 'req_body_json_prefix_in', snippet: 'req_body_json_prefix_in("","",false)', title: 'req_body_json_prefix_in(jsonpath, patterns, foldCase)' },
      { name: 'req_body_larger_than', snippet: 'req_body_larger_than(8192)', title: 'req_body_larger_than(bytes)' },
      { name: 'req_body_less_than', snippet: 'req_body_less_than(2048)', title: 'req_body_less_than(bytes)' }
    ]}
  ],

  card(title, body) {
    return '<div class="ivu-card ivu-card-bordered form-card">' +
      '<div class="ivu-card-head"><p>' + title + '</p></div>' +
      '<div class="ivu-card-body">' + body + '</div></div>';
  },

  escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  buildTableColgroup(columns) {
    var weights = columns.map(function (col) {
      return col.width || col.minWidth || 120;
    });
    var total = weights.reduce(function (sum, weight) { return sum + weight; }, 0) || 1;
    return '<colgroup>' + weights.map(function (weight) {
      return '<col style="width:' + ((weight / total) * 100).toFixed(4) + '%">';
    }).join('') + '</colgroup>';
  },

  pageTable(options) {
    options = options || {};
    var columns = options.columns || [];
    var rows = options.rows || [];
    var pageSize = options.pageSize || 20;
    var currentPage = options.currentPage || 1;
    var total = options.total != null ? options.total : rows.length;
    var searchValues = options.searchValues || {};
    var pageSizes = options.pageSizes || [20, 30, 40, 50];
    var tableId = options.tableId || 'page-table-main';
    var colgroup = IvuUI.buildTableColgroup(columns);

    var hasSearch = columns.some(function (c) { return c.searchable; });
    var searchHtml = '';
    if (hasSearch) {
      var searchCells = columns.map(function (col) {
        if (!col.searchable) {
          return '<td><div class="ivu-table-cell"></div></td>';
        }
        var val = searchValues[col.key] || '';
        if (col.searchType === 'select' && col.searchFilters && col.searchFilters.length) {
          var selectPh = col.searchPlaceholder || ('请选择' + col.title);
          var opts = '<option value="">' + IvuUI.escapeHtml(selectPh) + '</option>' +
            col.searchFilters.map(function (filter) {
              var selected = String(filter.value) === String(val) ? ' selected' : '';
              return '<option value="' + IvuUI.escapeHtml(filter.value) + '"' + selected + '>' +
                IvuUI.escapeHtml(filter.label) + '</option>';
            }).join('');
          return '<td><div class="ivu-table-cell">' +
            '<div class="ivu-select ivu-select-single proto-search-select-wrap" style="width:100%;">' +
              '<div class="ivu-select-selection">' +
                '<select class="proto-search-input proto-search-select" data-search-key="' + col.key + '">' +
                  opts +
                '</select>' +
              '</div>' +
            '</div></div></td>';
        }
        var ph = col.searchPlaceholder || ('请输入' + col.title + '查询');
        return '<td><div class="ivu-table-cell">' +
          '<div class="ivu-input-wrapper ivu-input-type-text" style="width:100%;">' +
            '<input type="text" class="ivu-input proto-search-input" data-search-key="' + col.key + '" value="' +
            IvuUI.escapeHtml(val) + '" placeholder="' + IvuUI.escapeHtml(ph) + '" />' +
          '</div></div></td>';
      }).join('');
      searchHtml =
        '<div class="searchTable">' +
          '<div class="ivu-table-wrapper">' +
            '<div class="ivu-table ivu-table-default" style="width:100%;">' +
              '<div class="ivu-table-body">' +
                '<table cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;">' +
                  colgroup +
                  '<tbody class="ivu-table-tbody"><tr class="iview_table_tr">' + searchCells + '</tr></tbody>' +
                '</table>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    var thead = columns.map(function (col) {
      var sortHtml = '';
      if (col.sortable) {
        sortHtml = '<span class="ivu-table-sort">' +
          '<i class="ivu-icon ivu-icon-md-arrow-dropup"></i>' +
          '<i class="ivu-icon ivu-icon-md-arrow-dropdown"></i></span>';
      }
      var sortAttr = col.sortable && col.key ? ' data-sort-key="' + col.key + '"' : '';
      return '<th' + sortAttr + '><div class="ivu-table-cell"><span>' + col.title + '</span>' + sortHtml + '</div></th>';
    }).join('');

    var tbody = rows.map(function (row, rowIndex) {
      var cells = columns.map(function (col) {
        var val = typeof col.render === 'function' ? col.render(row, rowIndex) : (row[col.key] != null && row[col.key] !== '' ? row[col.key] : '');
        return '<td><div class="ivu-table-cell">' + val + '</div></td>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');

    var sizeOptions = pageSizes.map(function (size) {
      var sel = size === pageSize ? ' selected' : '';
      return '<option value="' + size + '"' + sel + '>' + size + '条/页</option>';
    }).join('');

    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    var paginationHtml = '';
    if (options.cursorPaging) {
      // 主键游标分页：仅「上一页 / 下一页」，无页码与每页条数选择器（对齐真实 UI）
      var prevDisabled = options.prevDisabled != null ? options.prevDisabled : false;
      var nextDisabled = options.nextDisabled != null ? options.nextDisabled : false;
      paginationHtml =
        '<div class="el-pagination is-background page">' +
          '<button type="button" class="btn-prev proto-page-prev"' + (prevDisabled ? ' disabled' : '') + '>上一页</button>' +
          '<button type="button" class="btn-next proto-page-next"' + (nextDisabled ? ' disabled' : '') + '>下一页</button>' +
        '</div>';
    } else {
      var pagerItems = '';
      for (var p = 1; p <= totalPages; p++) {
        pagerItems += '<li class="number' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</li>';
      }
      paginationHtml = '<div class="el-pagination is-background page">' +
        '<span class="el-pagination__sizes">' +
          '<div class="el-select el-select--mini">' +
            '<select class="proto-page-size" style="height:28px;border:1px solid #dcdfe6;border-radius:3px;padding:0 8px;">' +
              sizeOptions +
            '</select>' +
          '</div>' +
        '</span>' +
        '<button type="button" class="btn-prev proto-page-prev"' + (currentPage <= 1 ? ' disabled' : '') + '>' +
          '<i class="el-icon el-icon-arrow-left"></i></button>' +
        '<ul class="el-pager">' + pagerItems + '</ul>' +
        '<button type="button" class="btn-next proto-page-next"' + (currentPage >= totalPages ? ' disabled' : '') + '>' +
          '<i class="el-icon el-icon-arrow-right"></i></button>' +
      '</div>';
    }

    return '<div class="page-table" id="' + tableId + '">' +
      searchHtml +
      '<div class="show-iView-Table">' +
        '<div class="ivu-table-wrapper">' +
          '<div class="ivu-table ivu-table-default ivu-table-border" style="width:100%;">' +
            '<div class="ivu-table-body">' +
              '<table cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;">' +
                colgroup +
                '<thead><tr>' + thead + '</tr></thead>' +
                '<tbody class="ivu-table-tbody">' + (tbody || '<tr><td colspan="' + columns.length + '"><div class="ivu-table-cell" style="text-align:center;color:#999;">暂无数据</div></td></tr>') + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      paginationHtml +
    '</div>';
  },

  table(columns, rows, options) {
    options = options || {};
    var thead = columns.map(function (c) { return '<th><div class="ivu-table-cell"><span>' + c.title + '</span></div></th>'; }).join('');
    var tbody = rows.map(function (row, rowIndex) {
      var cells = columns.map(function (col) {
        var val = typeof col.render === 'function' ? col.render(row, rowIndex) : (row[col.key] != null ? row[col.key] : '-');
        return '<td><div class="ivu-table-cell">' + val + '</div></td>';
      }).join('');
      var click = options.onRowClick ? ' class="ivu-table-row-hover proto-row-click" data-row="' + rowIndex + '"' : '';
      return '<tr' + click + '>' + cells + '</tr>';
    }).join('');
    var tableHtml =
      '<div class="page-table">' +
        '<div class="show-iView-Table">' +
          '<div class="ivu-table-wrapper">' +
            '<div class="ivu-table ivu-table-default ivu-table-border" style="width:100%;">' +
              '<div class="ivu-table-body">' +
                '<table cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;">' +
                  IvuUI.buildTableColgroup(columns) +
                  '<thead><tr>' + thead + '</tr></thead>' +
                  '<tbody class="ivu-table-tbody">' + tbody + '</tbody>' +
                '</table>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="el-pagination is-background page">' +
          '<span class="el-pagination__total">共 ' + rows.length + ' 条</span>' +
          '<ul class="el-pager"><li class="number active">1</li></ul>' +
        '</div>' +
      '</div>';
    return tableHtml;
  },

  drawer(id, title, body, footer, width) {
    width = width || '60%';
    var footerHtml = footer
      ? '<div class="ivu-drawer-footer proto-drawer-footer">' + footer + '</div>'
      : '';
    return '<div class="ivu-drawer-wrap proto-hidden" id="' + id + '">' +
      '<div class="ivu-drawer-mask" data-close-drawer="' + id + '"></div>' +
      '<div class="ivu-drawer ivu-drawer-right" style="width:' + width + ';">' +
        '<div class="ivu-drawer-content">' +
          '<div class="ivu-drawer-header">' +
            '<div class="ivu-drawer-header-inner">' + title + '</div>' +
            '<a class="ivu-drawer-close proto-drawer-close" data-close-drawer="' + id + '" href="javascript:void(0)" aria-label="关闭">' +
              '<span class="proto-drawer-close-x" aria-hidden="true">×</span>' +
            '</a>' +
          '</div>' +
          '<div class="ivu-drawer-body">' + body + '</div>' +
          footerHtml +
        '</div></div></div>';
  },

  modal(id, title, body, footer, width) {
    width = width || '700px';
    var footerHtml = footer
      ? '<div class="ivu-modal-footer">' + footer + '</div>'
      : '';
    return '<div class="ivu-modal-wrap proto-hidden" id="' + id + '">' +
      '<div class="ivu-modal-mask" data-close-modal="' + id + '"></div>' +
      '<div class="ivu-modal" style="width:' + width + ';">' +
        '<div class="ivu-modal-content">' +
          '<div class="ivu-modal-header">' +
            '<div class="ivu-modal-header-inner">' + title + '</div>' +
            '<a class="ivu-modal-close" data-close-modal="' + id + '" href="javascript:void(0)" aria-label="关闭">' +
              '<i class="ivu-icon ivu-icon-ios-close"></i>' +
            '</a>' +
          '</div>' +
          '<div class="ivu-modal-body">' + body + '</div>' +
          footerHtml +
        '</div></div></div>';
  },

  tabs(tabDefs, panesHtml) {
    var nav = tabDefs.map(function (t, i) {
      return '<div class="ivu-tabs-tab' + (i === 0 ? ' ivu-tabs-tab-active' : '') + '" data-tab="' + t.name + '">' + t.label + '</div>';
    }).join('');
    return (
      '<div class="ivu-tabs ivu-tabs-no-animation" data-proto-tabs>' +
        '<div class="ivu-tabs-bar">' +
          '<div class="ivu-tabs-nav-container">' +
            '<div class="ivu-tabs-nav-wrap">' +
              '<div class="ivu-tabs-nav-scroll">' +
                '<div class="ivu-tabs-nav">' + nav + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ivu-tabs-content">' + panesHtml + '</div>' +
      '</div>'
    );
  },

  tabPane(name, content, active) {
    var cls = 'ivu-tabs-tabpane';
    if (active) cls += ' ivu-tabs-tabpane-active';
    else cls += ' ivu-tabs-tabpane-inactive';
    return '<div class="' + cls + '" data-tab-pane="' + name + '">' + content + '</div>';
  },

  steps(stepTitles, current) {
    return stepTitles.map(function (title, i) {
      var cls = 'ivu-steps-item';
      if (i < current) cls += ' ivu-steps-status-finish';
      else if (i === current) cls += ' ivu-steps-status-process';
      else cls += ' ivu-steps-status-wait';
      return '<div class="' + cls + '"><div class="ivu-steps-head"><div class="ivu-steps-head-inner">' +
        '<span>' + (i + 1) + '</span></div></div><div class="ivu-steps-main">' +
        '<div class="ivu-steps-title">' + title + '</div></div></div>';
    }).join('');
  }
};
