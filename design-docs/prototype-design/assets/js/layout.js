/* 菜单图标对齐 src/layout/sidebar/navItem.vue */
var NAV_ICONS = {
  'AIGatewayInstancePool.list': 'iconfont icon-instancePool',
  'AICluster.list': 'iconfont icon-jiqun',
  'EppPool.list': 'iconfont icon-instancePool',
  'EppAssignment.list': 'iconfont icon-jiqun',
  'certs.list': 'iconfont icon-cert',
  'Provider.list': 'ivu-icon ivu-icon-ios-cloud',
  'AdvanceRouteRule.list': 'iconfont icon-zhuanfa',
  'user.list': 'iconfont icon-user',
  'APIKey.list': 'ivu-icon ivu-icon-ios-key',
  'Entity.list': 'ivu-icon ivu-icon-ios-settings',
  'consumer.admin.list': 'ivu-icon ivu-icon-md-people',
  'route.admin.list': 'ivu-icon ivu-icon-ios-cube',
  'resource.admin.list': 'ivu-icon ivu-icon-md-appstore',
  'ModelPrice.list': 'ivu-icon ivu-icon-logo-yen',
  'OperationLog.list': 'ivu-icon ivu-icon-md-list-box',
  'Report.list': 'ivu-icon ivu-icon-md-analytics',
};

function navIcon(id, fallback) {
  return NAV_ICONS[id] || fallback || '';
}

window.PrototypeNav = [
  {
    id: 'resource.admin.list',
    i18n: 'ResourceManage',
    text: '资源管理',
    icon: navIcon('resource.admin.list'),
    children: [
      {
        id: 'AIGatewayInstancePool.list',
        i18n: 'AIGatewayInstancePoolManage',
        page: 'instance-pool-ai.html',
        text: 'AI网关实例池',
        icon: navIcon('AIGatewayInstancePool.list'),
      },
      {
        id: 'Provider.list',
        i18n: 'ProviderManage',
        page: 'providers.html',
        text: '模型服务商',
        icon: navIcon('Provider.list'),
      },
      {
        id: 'AICluster.list',
        i18n: 'AIClusterManage',
        page: 'cluster-list.html',
        text: 'AI业务集群',
        icon: navIcon('AICluster.list'),
      },
      {
        id: 'EppPool.list',
        i18n: 'EppPoolManage',
        page: 'epp.html',
        text: 'EPP调度',
        icon: navIcon('EppPool.list'),
      },
      {
        id: 'ModelPrice.list',
        i18n: 'ModelPriceManage',
        page: 'model-prices.html',
        text: '模型定价',
        icon: navIcon('ModelPrice.list'),
      },
    ],
  },
  {
    id: 'route.admin.list',
    i18n: 'RouteManage',
    text: '路由管理',
    icon: navIcon('route.admin.list'),
    children: [
      {
        id: 'AdvanceRouteRule.list',
        i18n: 'RouteTableManage',
        page: 'route-tables.html',
        text: '路由表',
        icon: navIcon('AdvanceRouteRule.list'),
      },
    ],
  },
  {
    id: 'consumer.admin.list',
    i18n: 'ConsumerManage',
    text: '消费者管理',
    icon: navIcon('consumer.admin.list'),
    children: [
      {
        id: 'APIKey.list',
        i18n: 'APIKeyManage',
        page: 'api-key.html',
        text: 'API Key 管理',
        icon: navIcon('APIKey.list'),
      },
      {
        id: 'Entity.list',
        i18n: 'EntityManage',
        page: 'entity.html',
        text: 'Entity 管理',
        icon: navIcon('Entity.list'),
      },
    ],
  },
  {
    id: 'user.list',
    i18n: 'UserManage',
    page: 'user.html',
    text: '用户管理',
    icon: navIcon('user.list'),
  },
  {
    id: 'OperationLog.list',
    i18n: 'OperationLogManage',
    page: 'operation-logs.html',
    text: '操作日志',
    icon: navIcon('OperationLog.list'),
  },
  {
    id: 'Report.list',
    i18n: 'ReportManage',
    page: 'report.html',
    text: '数据报表',
    icon: navIcon('Report.list'),
  },
];

function navLabel(item) {
  if (window.Prototype && typeof Prototype.t === 'function' && item.i18n) {
    var translated = Prototype.t('nav.' + item.i18n);
    if (translated) return translated;
  }
  return item.text;
}

function findNavLabel(pageId) {
  var found =
    window.Prototype && typeof Prototype.t === 'function'
      ? Prototype.t('nav.home')
      : '首页';
  PrototypeNav.forEach(function (group) {
    if (group.page === pageId) found = navLabel(group);
    (group.children || []).forEach(function (child) {
      if (child.id === pageId) found = navLabel(child);
    });
  });
  return found;
}

function renderMenuItem(item, pageId, basePath) {
  if (item.children) {
    var sub = item.children
      .map(function (child) {
        var active =
          child.id === pageId
            ? ' ivu-menu-item-active ivu-menu-item-selected'
            : '';
        var href = basePath + 'pages/' + child.page;
        return (
          '<li class="ivu-menu-item' +
          active +
          '" name="' +
          child.id +
          '">' +
          '<a href="' +
          href +
          '" class="menu-link">' +
          '<i class="' +
          child.icon +
          '"></i> ' +
          navLabel(child) +
          '</a></li>'
        );
      })
      .join('');
    return (
      '<li class="ivu-menu-submenu ivu-menu-opened">' +
      '<div class="ivu-menu-submenu-title">' +
      '<i class="' +
      item.icon +
      '"></i> ' +
      navLabel(item) +
      '<i class="ivu-icon ivu-icon-ios-arrow-down ivu-menu-submenu-title-icon"></i></div>' +
      '<ul class="ivu-menu">' +
      sub +
      '</ul></li>'
    );
  }
  var activeTop =
    item.id === pageId ? ' ivu-menu-item-active ivu-menu-item-selected' : '';
  return (
    '<li class="ivu-menu-item' +
    activeTop +
    '">' +
    '<a href="' +
    basePath +
    'pages/' +
    item.page +
    '" class="menu-link">' +
    '<i class="' +
    item.icon +
    '"></i> ' +
    navLabel(item) +
    '</a></li>'
  );
}

window.Layout = {
  render(options) {
    var pageId = options.pageId || '';
    var basePath = options.basePath || '../';
    var lang = window.Prototype ? Prototype.getLang() : 'zh';
    var user = window.Prototype ? Prototype.getUser() : { name: 'admin' };
    var breadcrumb = options.breadcrumb || findNavLabel(pageId);
    var productTitle = window.Prototype
      ? Prototype.t('login.gateway')
      : '壬远 AI网关';
    var langLabel = lang === 'en' ? 'English' : '简体中文';
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.title = breadcrumb + ' - ' + productTitle;

    if (!document.querySelector('link[href*="iconfont.css"]')) {
      var iconLink = document.createElement('link');
      iconLink.rel = 'stylesheet';
      iconLink.href = basePath + 'assets/font/iconfont.css';
      document.head.appendChild(iconLink);
    }

    var menuHtml = PrototypeNav.map(function (item) {
      return renderMenuItem(item, pageId, basePath);
    }).join('');

    var logoutText = window.Prototype
      ? Prototype.t('com.cancellation')
      : '注销';
    var confirmTitle = window.Prototype
      ? Prototype.t('com.informationTips')
      : '信息提示';
    var confirmLogout = window.Prototype
      ? Prototype.t('login.tipConfirmLogout')
      : '确认注销？';
    var confirmOk = window.Prototype ? Prototype.t('com.confirm') : '确定';
    var confirmCancel = window.Prototype ? Prototype.t('com.cancel') : '取消';

    document.body.innerHTML =
      '<div id="product-body" style="height:100%;" data-proto-base="' +
      basePath +
      '">' +
      '<div class="app-layout">' +
      '<div class="bfe-sidebar">' +
      '<div class="header"><p class="text">' +
      productTitle +
      '</p></div>' +
      '<div class="Menu">' +
      '<ul class="ivu-menu ivu-menu-dark ivu-menu-vertical menu_list ivu-menu-opened" style="width:auto;">' +
      menuHtml +
      '</ul>' +
      '</div>' +
      '</div>' +
      '<div class="bfe-right-content">' +
      '<ul class="bfe-header">' +
      '<li>' +
      '<div class="ivu-dropdown proto-header-dropdown" data-proto-dropdown="lang">' +
      '<a href="javascript:void(0)" class="proto-dropdown-trigger header_box header_name">' +
      '<img class="img proto-header-lang-icon" src="' +
      basePath +
      'assets/static/img/loginBg.png" alt="" />' +
      '<span class="proto-lang-label">' +
      langLabel +
      '</span>' +
      '<span class="proto-dropdown-arrow" aria-hidden="true">▾</span>' +
      '</a>' +
      '<div class="ivu-select-dropdown proto-dropdown-menu">' +
      '<ul class="ivu-dropdown-menu">' +
      '<li class="ivu-dropdown-item' +
      (lang === 'zh' ? ' ivu-dropdown-item-selected' : '') +
      '" data-lang="zh">简体中文</li>' +
      '<li class="ivu-dropdown-item' +
      (lang === 'en' ? ' ivu-dropdown-item-selected' : '') +
      '" data-lang="en">English</li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '</li>' +
      '<li class="bfe-header-icon handleSidebarWidth">' +
      '<span class="proto-header-fold app-icon-title" aria-hidden="true">☰</span>' +
      '</li>' +
      '<li>' +
      '<div class="ivu-dropdown proto-header-dropdown" data-proto-dropdown="user">' +
      '<a href="javascript:void(0)" class="proto-dropdown-trigger header_name proto-header-user">' +
      '<span class="proto-header-user-icon" aria-hidden="true">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" focusable="false">' +
      '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>' +
      '</svg>' +
      '</span>' +
      '<span class="proto-user-name">' +
      (user.name || 'admin') +
      '</span>' +
      '<span class="proto-dropdown-arrow" aria-hidden="true">▾</span>' +
      '</a>' +
      '<div class="ivu-select-dropdown proto-dropdown-menu">' +
      '<ul class="ivu-dropdown-menu">' +
      '<li class="ivu-dropdown-item" data-action="logout">' +
      logoutText +
      '</li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '</li>' +
      '</ul>' +
      '<div class="bfe-content">' +
      '<div class="bfe-breadcrumb ivu-breadcrumb">' +
      '<span><span class="ivu-breadcrumb-item-link">' +
      breadcrumb +
      '</span></span>' +
      '</div>' +
      '<div class="bfe-content-view">' +
      '<div class="routerView" id="page-root"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div id="global-message"></div>' +
      '<div id="proto-confirm-wrap" class="ivu-modal-wrap proto-hidden">' +
      '<div class="ivu-modal-mask" data-proto-confirm-cancel></div>' +
      '<div class="ivu-modal proto-confirm-modal">' +
      '<div class="ivu-modal-content">' +
      '<div class="ivu-modal-header proto-confirm-header-wrap">' +
      '<div class="proto-confirm-header-inner">' +
      '<span class="proto-confirm-header-icon" aria-hidden="true">?</span>' +
      '<span class="proto-confirm-header-title" id="proto-confirm-title">' +
      confirmTitle +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="ivu-modal-body">' +
      '<p id="proto-confirm-content" class="proto-confirm-content">' +
      confirmLogout +
      '</p>' +
      '</div>' +
      '<div class="ivu-modal-footer proto-confirm-footer">' +
      '<button type="button" class="ivu-btn" id="proto-confirm-cancel">' +
      confirmCancel +
      '</button>' +
      '<button type="button" class="ivu-btn ivu-btn-primary" id="proto-confirm-ok">' +
      confirmOk +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    if (window.Prototype && typeof Prototype.initLayout === 'function') {
      Prototype.initLayout(basePath);
    }

    return document.getElementById('page-root');
  },
};
