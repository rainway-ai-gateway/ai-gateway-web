window.UserUpsert = {
  roleLabel(isAdmin) {
    return isAdmin ? '系统管理员' : '用户';
  },

  scopeLabel(scope) {
    if (scope === 'System') return '系统管理';
    if (scope === 'Product') return '租户管理';
    return '内部支持';
  },

  textField(id, value, placeholder, disabled) {
    var disabledAttr = disabled ? ' disabled' : '';
    return '<div class="ivu-input-wrapper ivu-input-type-text com-create-input">' +
      '<input type="text" id="' + id + '" class="ivu-input"' + disabledAttr +
      ' value="' + IvuUI.escapeHtml(value || '') + '" placeholder="' + IvuUI.escapeHtml(placeholder || '') + '" />' +
      '</div>';
  },

  passwordField(id, placeholder, autocomplete) {
    autocomplete = autocomplete || 'new-password';
    return '<div class="ivu-input-wrapper ivu-input-type-text com-create-input">' +
      '<input type="password" id="' + id + '" class="ivu-input" autocomplete="' + autocomplete + '" placeholder="' +
      IvuUI.escapeHtml(placeholder || '') + '" />' +
      '</div>';
  },

  adminCheckbox() {
    return '<label class="ivu-checkbox-wrapper ivu-checkbox-wrapper-checked ivu-checkbox-wrapper-disabled">' +
      '<span class="ivu-checkbox ivu-checkbox-checked ivu-checkbox-disabled"><span class="ivu-checkbox-inner"></span></span>' +
      '<span>系统管理员</span></label>';
  },

  scopeRadios(selected) {
    var scopes = [
      { value: 'System', label: '系统管理' },
      { value: 'Support', label: '内部支持' }
    ];
    return scopes.map(function (item) {
      var checked = item.value === selected ? ' checked' : '';
      return '<label class="proto-radio-item">' +
        '<input type="radio" name="token-scope" value="' + item.value + '"' + checked + ' /> ' +
        IvuUI.escapeHtml(item.label) +
        '</label>';
    }).join('');
  },

  createUserBody() {
    return '<form class="ivu-form ivu-form-label-top user-upsert-form">' +
      IvuUI.formTopItem('用户名', UserUpsert.textField('user-create-name', '', '请输入用户名'), true) +
      IvuUI.formTopItem('密码', UserUpsert.passwordField('user-create-password', '请输入密码'), true) +
      IvuUI.formTopItem('确认密码', UserUpsert.passwordField('user-create-confirm', '请再次确认密码'), true) +
      IvuUI.formTopItem('角色', UserUpsert.adminCheckbox(), false) +
      '</form>';
  },

  updatePasswordBody(row, showOldPassword) {
    row = row || {};
    var oldPasswordField = showOldPassword
      ? IvuUI.formTopItem('原密码', UserUpsert.passwordField('user-password-old', '请输入原密码', 'off'), true)
      : '';
    return '<form class="ivu-form ivu-form-label-top user-upsert-form">' +
      IvuUI.formTopItem('用户名', UserUpsert.textField('user-password-name', row.user_name || '', '请输入用户名', true), true) +
      oldPasswordField +
      IvuUI.formTopItem('新密码', UserUpsert.passwordField('user-password-new', window.Prototype ? Prototype.t('user.passwordPlaceholder') : '长度 8-72 字节（bcrypt 上限），不含空白字符，不能等于用户名或其逆序', 'off'), true) +
      IvuUI.formTopItem('确认密码', UserUpsert.passwordField('user-password-confirm', '请再次确认密码', 'off'), true) +
      '</form>';
  },

  createTokenBody() {
    return '<form class="ivu-form ivu-form-label-top user-upsert-form">' +
      IvuUI.formTopItem('名称', UserUpsert.textField('token-create-name', '', '请输入名称'), true) +
      IvuUI.formTopItem('角色', '<div class="proto-radio-group">' + UserUpsert.scopeRadios('') + '</div>', true) +
      '</form>';
  },

  tokenDetailBody(info) {
    info = info || {};
    var productRow = info.scope === 'Product'
      ? '<ul class="clearFloat">' +
          '<li class="title">产品线:</li>' +
          '<li class="value">' + IvuUI.escapeHtml(info.product_name || '-') + '</li>' +
        '</ul>'
      : '';
    return '<div class="panel token-detail-panel">' +
      '<div class="panel-body">' +
        '<ul class="clearFloat">' +
          '<li class="title">名称:</li>' +
          '<li class="value">' + IvuUI.escapeHtml(info.name || '-') + '</li>' +
        '</ul>' +
        '<ul class="clearFloat">' +
          '<li class="title">Scope:</li>' +
          '<li class="value">' + IvuUI.escapeHtml(UserUpsert.scopeLabel(info.scope)) + '</li>' +
        '</ul>' +
        productRow +
        '<ul class="clearFloat">' +
          '<li class="title">Token:</li>' +
          '<li class="value">' + IvuUI.escapeHtml(info.token || '-') + '</li>' +
        '</ul>' +
      '</div>' +
    '</div>';
  },

  drawerUser() {
    var footer =
      '<div class="com-btn-box drawer-footer user-drawer-footer" id="user-drawer-footer-create">' +
        IvuUI.btn('创建', 'primary', 'small', '', 'id="btn-user-create-submit"') + ' ' +
        IvuUI.btn('重置', 'default', 'small', 'com-create-btn reset-btn', 'id="btn-user-create-reset"') +
      '</div>' +
      '<div class="com-btn-box drawer-footer user-drawer-footer proto-hidden" id="user-drawer-footer-password">' +
        IvuUI.btn('提交', 'primary', 'small', '', 'id="btn-user-password-submit"') + ' ' +
        IvuUI.btn('取消', 'default', 'small', '', 'id="btn-user-password-cancel"') +
      '</div>';
    return IvuUI.drawer('drawer-user', '添加用户', UserUpsert.createUserBody(), footer, '30%');
  },

  drawerTokenCreate() {
    var footer =
      '<div class="com-btn-box drawer-footer user-drawer-footer">' +
        IvuUI.btn('提交', 'primary', 'small', '', 'id="btn-token-create-submit"') + ' ' +
        IvuUI.btn('重置', 'default', 'small', '', 'id="btn-token-create-reset"') +
      '</div>';
    return IvuUI.drawer('drawer-token-create', '', UserUpsert.createTokenBody(), footer, '30%');
  },

  drawerTokenDetail() {
    return IvuUI.drawer('drawer-token-detail', '详情', UserUpsert.tokenDetailBody({}), '', '40%');
  }
};
