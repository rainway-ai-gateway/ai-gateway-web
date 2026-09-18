window.Prototype = {
  toastTimer: null,
  LANG_KEY: 'prototype_lang',
  USER_KEY: 'prototype_user',

  messages: {
    zh: {
      'login.gateway': '壬远 AI网关',
      'login.tipConfirmLogout': '确认注销？',
      'com.informationTips': '信息提示',
      'com.confirm': '确定',
      'com.cancel': '取消',
      'com.confirmDelX': '是否删除{obj}',
      'com.tipDelSucc': '删除成功!',
      'com.cancellation': '注销',
      'com.tipCancel': '取消操作',
      'nav.home': '首页',
      'nav.ResourceManage': '资源管理',
      'nav.AIGatewayInstancePoolManage': 'AI网关实例池',
      'nav.ProviderManage': '模型服务商',
      'nav.AIClusterManage': 'AI业务集群',
      'nav.RouteManage': '路由管理',
      'nav.RouteTableManage': '路由表',
      'nav.DefaultRouteRuleManage': '默认转发规则',
      'nav.AdvanceRouteRuleManage': '路由规则',
      'nav.ConsumerManage': '消费者管理',
      'nav.EntityManage': 'Entity管理',
      'nav.APIKeyManage': 'API Key 管理',
      'nav.ModelManage': '模型管理',
      'nav.ModelPriceManage': '模型定价',
      'nav.UserManage': '用户管理',
      'nav.OperationLogManage': '操作日志',
      'nav.EppPoolManage': 'EPP调度',
      'nav.CertsManage': '证书管理',
      'nav.ReportManage': '数据报表',
    },
    en: {
      'login.gateway': 'Rainway AI Gateway',
      'login.tipConfirmLogout': 'Confirm logout?',
      'com.informationTips': 'Tips',
      'com.confirm': 'Confirm',
      'com.cancel': 'Cancel',
      'com.confirmDelX': 'Delete {obj}?',
      'com.tipDelSucc': 'Deleted successfully!',
      'com.cancellation': 'Logout',
      'com.tipCancel': 'Operation cancelled',
      'nav.home': 'Home',
      'nav.ResourceManage': 'Resource Manage',
      'nav.AIGatewayInstancePoolManage': 'AI Gateway Instance Pool Manage',
      'nav.ProviderManage': 'Model Providers',
      'nav.AIClusterManage': 'AI Cluster Manage',
      'nav.RouteManage': 'Route Manage',
      'nav.RouteTableManage': 'Route Tables',
      'nav.DefaultRouteRuleManage': 'Default Route Rule Manage',
      'nav.AdvanceRouteRuleManage': 'Advance Route Rule Manage',
      'nav.ConsumerManage': 'Consumer Manage',
      'nav.EntityManage': 'Entity Manage',
      'nav.APIKeyManage': 'API Key Manage',
      'nav.ModelManage': 'Model Manage',
      'nav.ModelPriceManage': 'Model Pricing',
      'nav.UserManage': 'User Manage',
      'nav.OperationLogManage': 'Operation Logs',
      'nav.EppPoolManage': 'EPP Scheduling',
      'nav.ReportManage': 'Data Report',
    },
  },

  getLang() {
    var lang = localStorage.getItem(this.LANG_KEY);
    return lang === 'en' ? 'en' : 'zh';
  },

  setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    if (this.getLang() === lang) {
      this.closeAllDropdowns();
      return;
    }
    localStorage.setItem(this.LANG_KEY, lang);
    location.reload();
  },

  getUser() {
    try {
      var raw = localStorage.getItem(this.USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
    return { name: 'admin' };
  },

  setUser(user) {
    localStorage.setItem(
      this.USER_KEY,
      JSON.stringify(user || { name: 'admin' }),
    );
  },

  removeUser() {
    localStorage.removeItem(this.USER_KEY);
  },

  t(key, vars) {
    var lang = this.getLang();
    var pack = this.messages[lang] || this.messages.zh;
    var text = pack[key] || this.messages.zh[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), vars[name]);
      });
    }
    return text;
  },

  closeAllDropdowns() {
    document
      .querySelectorAll('.proto-header-dropdown.proto-dropdown-open')
      .forEach(function (el) {
        el.classList.remove('proto-dropdown-open');
      });
  },

  confirm(options) {
    options = options || {};
    var wrap = document.getElementById('proto-confirm-wrap');
    var titleEl = document.getElementById('proto-confirm-title');
    var contentEl = document.getElementById('proto-confirm-content');
    var okBtn = document.getElementById('proto-confirm-ok');
    var cancelBtn = document.getElementById('proto-confirm-cancel');
    if (!wrap || !okBtn || !cancelBtn) {
      if (window.confirm(options.content || this.t('login.tipConfirmLogout'))) {
        if (options.onOk) options.onOk();
      } else if (options.onCancel) {
        options.onCancel();
      }
      return;
    }

    if (titleEl)
      titleEl.textContent = options.title || this.t('com.informationTips');
    if (contentEl)
      contentEl.textContent =
        options.content || this.t('login.tipConfirmLogout');

    var nextOk = options.onOk;
    var nextCancel = options.onCancel;
    wrap.classList.remove('proto-hidden');

    function cleanup() {
      wrap.classList.add('proto-hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      wrap
        .querySelectorAll('[data-proto-confirm-cancel]')
        .forEach(function (el) {
          el.onclick = null;
        });
    }

    okBtn.onclick = function () {
      cleanup();
      if (nextOk) nextOk();
    };
    cancelBtn.onclick = function () {
      cleanup();
      if (nextCancel) nextCancel();
    };
    wrap.querySelectorAll('[data-proto-confirm-cancel]').forEach(function (el) {
      el.onclick = function () {
        cleanup();
        if (nextCancel) nextCancel();
      };
    });
  },

  logout() {
    var basePath = '';
    var body = document.getElementById('product-body');
    if (body) basePath = body.getAttribute('data-proto-base') || '../';
    this.removeUser();
    window.location.href = basePath + 'login.html';
  },

  initLayout(basePath) {
    this._layoutBasePath = basePath || '../';
    this.bindHeaderActions();
  },

  bindHeaderActions() {
    if (this._headerBound) return;
    this._headerBound = true;

    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target) return;

      var trigger = target.closest
        ? target.closest('.proto-dropdown-trigger')
        : null;
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        var dropdown = trigger.closest('.proto-header-dropdown');
        if (!dropdown) return;
        var wasOpen = dropdown.classList.contains('proto-dropdown-open');
        Prototype.closeAllDropdowns();
        if (!wasOpen) dropdown.classList.add('proto-dropdown-open');
        return;
      }

      var langItem = target.closest ? target.closest('[data-lang]') : null;
      if (
        langItem &&
        langItem.closest('.proto-header-dropdown[data-proto-dropdown="lang"]')
      ) {
        event.preventDefault();
        Prototype.setLang(langItem.getAttribute('data-lang'));
        return;
      }

      var logoutItem = target.closest
        ? target.closest('[data-action="logout"]')
        : null;
      if (logoutItem) {
        event.preventDefault();
        Prototype.closeAllDropdowns();
        Prototype.confirm({
          content: Prototype.t('login.tipConfirmLogout'),
          onOk: function () {
            Prototype.logout();
          },
          onCancel: function () {
            Prototype.toast(Prototype.t('com.tipCancel'), 'info');
          },
        });
        return;
      }

      if (!target.closest || !target.closest('.proto-header-dropdown')) {
        Prototype.closeAllDropdowns();
      }
    });
  },

  toast(message, type) {
    type = type || 'success';
    var iconMap = {
      success: 'ivu-icon-ios-checkmark-circle',
      error: 'ivu-icon-ios-close-circle',
      info: 'ivu-icon-ios-information-circle',
    };
    var colorMap = {
      success: '#19be6b',
      error: '#ed4014',
      info: '#2d8cf0',
    };
    var icon = iconMap[type] || iconMap.success;
    var color = colorMap[type] || colorMap.success;
    var wrap = document.getElementById('global-message');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="ivu-message" style="top:20px;">' +
      '<div class="ivu-message-notice">' +
      '<div class="ivu-message-notice-content">' +
      '<div class="ivu-message-custom">' +
      '<i class="ivu-icon ' +
      icon +
      '" style="color:' +
      color +
      ';margin-right:8px;"></i>' +
      '<span>' +
      message +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(function () {
      wrap.innerHTML = '';
    }, 2500);
  },

  openDrawer(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('proto-hidden');
  },

  closeDrawer(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('proto-hidden');
  },

  openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('proto-hidden');
  },

  closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('proto-hidden');
  },

  initTabs(container) {
    if (!container) return;
    container.querySelectorAll('.ivu-tabs-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.getAttribute('data-tab');
        container.querySelectorAll('.ivu-tabs-tab').forEach(function (t) {
          t.classList.remove('ivu-tabs-tab-active');
        });
        container.querySelectorAll('[data-tab-pane]').forEach(function (p) {
          p.classList.remove('ivu-tabs-tabpane-active');
        });
        tab.classList.add('ivu-tabs-tab-active');
        var pane = container.querySelector('[data-tab-pane="' + name + '"]');
        if (pane) pane.classList.add('ivu-tabs-tabpane-active');
      });
    });
  },

  initSteps(options) {
    var panels = options.panels;
    var nextBtn = options.nextBtn;
    var prevBtn = options.prevBtn;
    var submitBtn = options.submitBtn;
    var stepsBar = options.stepsBar;
    var current = 0;
    var titles = options.titles || [];

    function render() {
      if (stepsBar && titles.length) {
        stepsBar.innerHTML =
          '<div class="ivu-steps ivu-steps-horizontal">' +
          IvuUI.steps(titles, current) +
          '</div>';
      }
      panels.forEach(function (panel, index) {
        panel.classList.toggle('proto-hidden-inline', index !== current);
      });
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn)
        nextBtn.classList.toggle(
          'proto-hidden-inline',
          current === panels.length - 1,
        );
      if (submitBtn)
        submitBtn.classList.toggle(
          'proto-hidden-inline',
          current !== panels.length - 1,
        );
    }

    if (nextBtn)
      nextBtn.addEventListener('click', function () {
        if (current < panels.length - 1) {
          current += 1;
          render();
        }
      });
    if (prevBtn)
      prevBtn.addEventListener('click', function () {
        if (current > 0) {
          current -= 1;
          render();
        }
      });
    if (submitBtn)
      submitBtn.addEventListener('click', function () {
        if (typeof options.onSubmit === 'function') {
          options.onSubmit();
          return;
        }
        Prototype.toast('提交成功！');
        if (options.redirect !== false && options.redirect !== null) {
          setTimeout(function () {
            window.location.href = options.redirect || 'cluster-list.html';
          }, 800);
        }
      });
    render();
  },

  bindDrawerClose() {
    if (this._drawerCloseBound) return;
    this._drawerCloseBound = true;
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target) return;
      var closeBtn = target.closest
        ? target.closest('[data-close-drawer]')
        : null;
      if (closeBtn) {
        event.preventDefault();
        Prototype.closeDrawer(closeBtn.getAttribute('data-close-drawer'));
        return;
      }
      var openBtn = target.closest
        ? target.closest('[data-open-drawer]')
        : null;
      if (openBtn) {
        event.preventDefault();
        Prototype.openDrawer(openBtn.getAttribute('data-open-drawer'));
      }
    });
  },

  bindModalClose() {
    if (this._modalCloseBound) return;
    this._modalCloseBound = true;
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var closeEl = target.closest('[data-close-modal]');
      if (!closeEl) return;
      event.preventDefault();
      Prototype.closeModal(closeEl.getAttribute('data-close-modal'));
    });
  },

  cellText(row, key) {
    if (!row) return '';
    var value = row[key];
    if (Array.isArray(value)) return value.join(', ');
    if (value === true || value === false) return String(value);
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  },

  sortRows(rows, sortKey, sortOrder, getValue) {
    if (!sortKey || !sortOrder) return (rows || []).slice();
    var getter =
      getValue ||
      function (row, key) {
        return Prototype.cellText(row, key);
      };
    return (rows || []).slice().sort(function (a, b) {
      var av = String(getter(a, sortKey) || '').toUpperCase();
      var bv = String(getter(b, sortKey) || '').toUpperCase();
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  },

  cycleSort(state, key) {
    if (state.sortKey === key) {
      if (state.sortOrder === 'asc') {
        state.sortOrder = 'desc';
      } else {
        state.sortKey = '';
        state.sortOrder = '';
      }
    } else {
      state.sortKey = key;
      state.sortOrder = 'asc';
    }
    if (state.currentPage != null) state.currentPage = 1;
    if (state.page != null) state.page = 1;
  },

  paintSort(container, sortKey, sortOrder) {
    if (!container) return;
    container.querySelectorAll('th[data-sort-key]').forEach(function (th) {
      var icons = th.querySelectorAll('.ivu-table-sort i');
      if (icons.length < 2) return;
      icons[0].style.color = '#c5c8ce';
      icons[1].style.color = '#c5c8ce';
      if (th.getAttribute('data-sort-key') === sortKey) {
        if (sortOrder === 'asc') icons[0].style.color = '#2d8cf0';
        else if (sortOrder === 'desc') icons[1].style.color = '#2d8cf0';
      }
    });
  },

  bindPageTableSort(container, state, rerender) {
    if (!container || !state || !rerender) return;
    container.querySelectorAll('th[data-sort-key]').forEach(function (th) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', function (event) {
        if (
          event.target.closest &&
          event.target.closest('input, select, button, a')
        )
          return;
        Prototype.cycleSort(state, th.getAttribute('data-sort-key'));
        rerender();
      });
    });
    Prototype.paintSort(container, state.sortKey, state.sortOrder);
  },

  bindPageTableSearch(container, onSearch) {
    if (!container) return;
    container.querySelectorAll('.proto-search-input').forEach(function (el) {
      var handler = function () {
        onSearch(el.getAttribute('data-search-key'), el.value);
      };
      if (el.tagName === 'SELECT') el.onchange = handler;
      else el.oninput = handler;
      el.onclick = function (e) {
        e.stopPropagation();
      };
    });
    container
      .querySelectorAll('.searchTable .ivu-table-tbody tr')
      .forEach(function (tr) {
        tr.onclick = function (e) {
          e.stopPropagation();
        };
      });
  },

  bindRowClick(container, handler) {
    if (!container) return;
    container.querySelectorAll('.proto-row-click').forEach(function (tr) {
      tr.addEventListener('click', function () {
        handler(parseInt(tr.getAttribute('data-row'), 10));
      });
    });
  },

  confirmDelete(message, onOk) {
    if (window.confirm(message || '是否删除？')) {
      if (onOk) onOk();
      Prototype.toast('删除成功!');
    }
  },

  pageHeadExtraCss: [],
};

document.addEventListener('DOMContentLoaded', function () {
  Prototype.bindDrawerClose();
  Prototype.bindModalClose();
  Prototype.bindHeaderActions();
});
