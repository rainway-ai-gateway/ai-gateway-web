/**
* Copyright(c) 2026 The Rainway AI Gateway (壬远AI网关) Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http: //www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
<template>
  <div>
    <!-- 统计摘要 -->
    <div class="proto-epp-summary" style="margin-top:16px;margin-bottom:16px;">
      <span style="margin-right:24px;"
        >{{ $t('eppPool.poolName')

        }}：<strong>{{ poolData.name }}</strong></span
      >
      <span style="margin-right:24px;"
        >{{ $t('eppPool.groupCount') }}：<strong>{{
          (poolData.groups || []).length
        }}</strong></span
      >
      <span
        >{{ $t('eppPool.instanceCount') }}：<strong>{{
          totalInstances
        }}</strong></span
      >
    </div>

    <!-- 工具栏 -->
    <div v-if="editing" style="text-align:right;margin-bottom:12px;">
      <Button
        type="primary"
        size="small"
        :loading="saving"
        style="margin-right:8px;"
        @click="savePool"
      >
        {{ $t('eppPool.save') }}
      </Button>
      <Button
        size="small"
        @click="cancelEdit"
        >{{ $t('eppPool.cancel') }}</Button
      >
    </div>
    <div v-else style="text-align:right;margin-bottom:12px;">
      <Button
        type="primary"
        size="small"
        :loading="loading"
        @click="startEdit"
        >{{ $t('eppPool.edit') }}</Button
      >
    </div>

    <Form ref="poolForm" :model="poolData">
      <Table
        ref="poolTable"
        :key="tableKey"
        :columns="columns"
        :data="tableRows"
        :loading="loading"
        border
        class="epp-pool-table"
        style="width:100%;"
        @on-expand="handleExpand"
      />
    </Form>

    <div v-if="editing" style="margin-top:12px;">
      <Button type="primary" size="small" @click="addGroup">{{
        $t('eppPool.addGroup')
      }}</Button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'EppPool',
  data() {
    return {
      loading: false,
      saving: false,
      editing: false,
      version: 0,
      uidSeq: 0,
      poolData: { name: 'EPP.pool', groups: [] },
      originalData: null,
    };
  },
  computed: {
    tableKey() {
      return `pool-${this.editing ? 'edit' : 'view'}`;
    },
    tableRows() {
      void this.version;
      return (this.poolData.groups || []).slice();
    },
    totalInstances() {
      return (this.poolData.groups || []).reduce(
        (sum, g) => sum + (g.instances || []).length,
        0,
      );
    },
    columns() {
      const cols = [
        {
          type: 'expand',
          width: 40,
          render: (h, params) => {
            return this.renderExpandContent(h, params.index);
          },
        },
        {
          title: this.$t('eppPool.groupName'),
          key: 'name',
          render: (h, params) => {
            const index = params.index;
            if (this.editing) {
              return h(
                'FormItem',
                {
                  props: {
                    prop: `groups.${index}.name`,
                    rules: this.groupNameRules(index),
                  },
                },
                [
                  h('Input', {
                    props: {
                      value: this.getGroup(index).name,
                      placeholder: this.$t('eppPool.groupNameUnique'),
                      size: 'small',
                    },
                    style: 'width:100%;',
                    on: {
                      input: (val) => {
                        this.$set(this.getGroup(index), 'name', val);
                        this.refreshErrorFields();
                      },
                    },
                  }),
                ],
              );
            }
            return h('strong', this.getGroup(index).name);
          },
        },
        {
          title: this.$t('eppPool.instanceCount2'),
          key: 'instanceCount',
          width: 100,
          render: (h, params) => {
            return h(
              'span',
              (this.getGroup(params.index).instances || []).length,
            );
          },
        },
        {
          title: this.$t('eppPool.instanceList'),
          key: 'instanceSummary',
          render: (h, params) => {
            const summary = (this.getGroup(params.index).instances || [])
              .map((inst) => `${inst.id}(${inst.host}:${inst.port})`)
              .join(', ');
            return h(
              'span',
              { style: 'font-size:12px;color:#808695;' },
              summary || '-',
            );
          },
        },
      ];

      if (this.editing) {
        cols.push({
          title: this.$t('com.operation'),
          key: 'action',
          width: 120,
          render: (h, params) => {
            const index = params.index;
            const onlyOneGroup = this.poolData.groups.length <= 1;
            return h(
              'Button',
              {
                props: { type: 'error', size: 'small', disabled: onlyOneGroup },
                attrs: {
                  title: onlyOneGroup ? this.$t('eppPool.atLeastOneGroup') : '',
                },
                on: {
                  click: () => this.deleteGroup(index),
                },
              },
              this.$t('eppPool.deleteGroup'),
            );
          },
        });
      }
      return cols;
    },
  },
  mounted() {
    this.fetchPool();
  },
  methods: {
    getGroup(index) {
      return this.poolData.groups[index] || { name: '', instances: [] };
    },
    assignUids(groups) {
      (groups || []).forEach((g) => {
        if (g.uid == null) {
          this.uidSeq += 1;
          g.uid = this.uidSeq;
        }
      });
    },
    getInstance(groupIndex, index) {
      const group = this.getGroup(groupIndex);
      return (group.instances || [])[index] || { id: '', host: '', port: 9002 };
    },
    fetchPool() {
      this.loading = true;
      this.$request({
        url: 'epp-pool',
        method: 'get',
        openapi: true,
        unneedTips: true,
      })
        .then((res) => {
          if (res.status === 200 && res.data && res.data.ErrNum === 200) {
            this.poolData = res.data.Data || { name: 'EPP.pool', groups: [] };
          } else {
            this.poolData = { name: 'EPP.pool', groups: [] };
          }
          this.assignUids(this.poolData.groups);
          this.version++;
        })
        .catch(() => {
          this.poolData = { name: 'EPP.pool', groups: [] };
          this.version++;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    startEdit() {
      this.originalData = JSON.parse(JSON.stringify(this.poolData));
      this.editing = true;
    },
    cancelEdit() {
      if (this.originalData) {
        this.poolData = this.originalData;
        this.originalData = null;
      }
      this.editing = false;
      this.version++;
    },
    validatePool() {
      const groups = this.poolData.groups || [];
      if (!groups.length) {
        return this.$t('eppPool.atLeastOneGroup');
      }
      const groupNames = new Set();
      const instanceIds = new Set();
      const hostPorts = new Set();
      for (let i = 0; i < groups.length; i++) {
        const name = String(groups[i].name || '').trim();
        if (!name) {
          return this.$t('eppPool.groupNameRequired', { index: i + 1 });
        }
        if (groupNames.has(name)) {
          return this.$t('eppPool.groupNameDup', { name });
        }
        groupNames.add(name);
        const insts = groups[i].instances || [];
        if (!insts.length) {
          return this.$t('eppPool.groupNeedInstance', { index: i + 1 });
        }
        for (let j = 0; j < insts.length; j++) {
          const inst = insts[j];
          const id = String(inst.id || '').trim();
          if (!id) {
            return this.$t('eppPool.instanceIdRequired', {
              group: i + 1,
              index: j + 1,
            });
          }
          if (instanceIds.has(id)) {
            return this.$t('eppPool.instanceIdDup', { id });
          }
          instanceIds.add(id);
          const host = String(inst.host || '').trim();
          if (!this.isValidHost(host)) {
            return this.$t('eppPool.instanceHostInvalid', {
              group: i + 1,
              index: j + 1,
            });
          }
          const port = inst.port;
          if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return this.$t('eppPool.instancePortInvalid', {
              group: i + 1,
              index: j + 1,
            });
          }
          const hostPort = `${host}:${port}`;
          if (hostPorts.has(hostPort)) {
            return this.$t('eppPool.instanceHostPortDup', { hostPort });
          }
          hostPorts.add(hostPort);
        }
      }
      return '';
    },
    isValidHost(value) {
      const s = String(value || '').trim();
      if (!s || s.length > 255) {
        return false;
      }
      if (/^\d+(\.\d+){3}$/.test(s)) {
        return s.split('.').every((p) => p.length <= 3 && Number(p) <= 255);
      }
      if (s.includes(':')) {
        return this.isValidIpv6(s);
      }
      return s
        .split('.')
        .every(
          (label) =>
            label.length >= 2 &&
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label) &&
            !/^\d+$/.test(label),
        );
    },
    isValidIpv6(value) {
      const parsePart = (part) => {
        if (part === '') {
          return [];
        }
        const groups = part.split(':');
        const ok = groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g));
        return ok ? groups : null;
      };
      const halves = value.split('::');
      if (halves.length === 1) {
        const groups = parsePart(value);
        return groups !== null && groups.length === 8;
      }
      if (halves.length > 2) {
        return false;
      }
      const left = parsePart(halves[0]);
      const right = parsePart(halves[1]);
      return left !== null && right !== null && left.length + right.length <= 7;
    },
    refreshErrorFields() {
      const items = this.$el.querySelectorAll('.ivu-form-item');
      Array.prototype.forEach.call(items, (el) => {
        const item = el.__vue__;
        if (item && item.validateState === 'error') {
          item.validate('');
        }
      });
    },
    refreshHostPortFields(groupIndex, instIndex) {
      const targets = [
        `groups.${groupIndex}.instances.${instIndex}.host`,
        `groups.${groupIndex}.instances.${instIndex}.port`,
      ];
      const items = this.$el.querySelectorAll('.ivu-form-item');
      Array.prototype.forEach.call(items, (el) => {
        const item = el.__vue__;
        if (item && targets.includes(item.prop)) {
          item.validate('');
        }
      });
    },
    groupNameRules(index) {
      return [
        {
          validator: (rule, value, callback) => {
            const name = String(value || '').trim();
            if (!name) {
              callback(
                new Error(
                  this.$t('eppPool.groupNameRequired', { index: index + 1 }),
                ),
              );
              return;
            }
            const dup = (this.poolData.groups || []).some(
              (g, i) => i !== index && String(g.name || '').trim() === name,
            );
            if (dup) {
              callback(new Error(this.$t('eppPool.groupNameDup', { name })));
              return;
            }
            callback();
          },
        },
      ];
    },
    instanceIdRules(groupIndex, index) {
      return [
        {
          validator: (rule, value, callback) => {
            const id = String(value || '').trim();
            if (!id) {
              callback(
                new Error(
                  this.$t('eppPool.instanceIdRequired', {
                    group: groupIndex + 1,
                    index: index + 1,
                  }),
                ),
              );
              return;
            }
            let count = 0;
            (this.poolData.groups || []).forEach((g) => {
              (g.instances || []).forEach((inst) => {
                if (String(inst.id || '').trim() === id) {
                  count += 1;
                }
              });
            });
            if (count > 1) {
              callback(new Error(this.$t('eppPool.instanceIdDup', { id })));
              return;
            }
            callback();
          },
        },
      ];
    },
    instanceHostRules(groupIndex, index) {
      return [
        {
          validator: (rule, value, callback) => {
            const host = String(value || '').trim();
            if (!this.isValidHost(host)) {
              callback(
                new Error(
                  this.$t('eppPool.instanceHostInvalid', {
                    group: groupIndex + 1,
                    index: index + 1,
                  }),
                ),
              );
              return;
            }
            const dupErr = this.hostPortDupError(groupIndex, index, host);
            if (dupErr) {
              callback(new Error(dupErr));
              return;
            }
            callback();
          },
        },
      ];
    },
    instancePortRules(groupIndex, index) {
      return [
        {
          validator: (rule, value, callback) => {
            const port = value;
            if (!Number.isInteger(port) || port < 1 || port > 65535) {
              callback(
                new Error(
                  this.$t('eppPool.instancePortInvalid', {
                    group: groupIndex + 1,
                    index: index + 1,
                  }),
                ),
              );
              return;
            }
            const dupErr = this.hostPortDupError(
              groupIndex,
              index,
              String(this.getInstance(groupIndex, index).host || '').trim(),
            );
            if (dupErr) {
              callback(new Error(dupErr));
              return;
            }
            callback();
          },
        },
      ];
    },
    hostPortDupError(groupIndex, index, host) {
      const port = this.getInstance(groupIndex, index).port;
      if (!host || !Number.isInteger(port)) {
        return '';
      }
      const hostPort = `${host}:${port}`;
      let count = 0;
      (this.poolData.groups || []).forEach((g) => {
        (g.instances || []).forEach((inst) => {
          const hp = `${String(inst.host || '').trim()}:${inst.port}`;
          if (hp === hostPort) {
            count += 1;
          }
        });
      });
      return count > 1
        ? this.$t('eppPool.instanceHostPortDup', { hostPort })
        : '';
    },
    savePool() {
      this.$refs.poolForm.validate((valid) => {
        const errMsg = this.validatePool();
        if (!valid || errMsg) {
          this.$Message.error(errMsg || this.$t('eppPool.formInvalid'));
          return;
        }
        this.doSavePool();
      });
    },
    doSavePool() {
      this.saving = true;
      const groups = (this.poolData.groups || []).map((g) => ({
        name: String(g.name || '').trim(),
        instances: (g.instances || []).map((inst) => ({
          id: String(inst.id || '').trim(),
          host: String(inst.host || '').trim(),
          port: inst.port,
        })),
      }));
      this.$request({
        url: 'epp-pool',
        method: 'patch',
        openapi: true,
        data: { groups },
      })
        .then((res) => {
          if (res.status === 200 && res.data && res.data.ErrNum === 200) {
            this.$Message.success(this.$t('eppPool.saveSucc'));
            this.poolData = res.data.Data || this.poolData;
            this.editing = false;
            this.originalData = null;
            this.version++;
          }
        })
        .catch((err) => {
          console.error('save epp-pool error:', err);
        })
        .finally(() => {
          this.saving = false;
        });
    },
    addGroup() {
      this.uidSeq += 1;
      this.poolData.groups.push({
        name: '',
        instances: [],
        _expanded: true,
        uid: this.uidSeq,
      });
      this.version++;
    },
    handleExpand(row, status) {
      const idx = (this.poolData.groups || []).findIndex(
        (g) => g.uid === row.uid,
      );
      if (idx > -1) {
        this.$set(this.poolData.groups[idx], '_expanded', status);
      }
    },
    deleteGroup(index) {
      const group = this.getGroup(index);
      this.$Modal.confirm({
        content: this.$t('eppPool.deleteGroupConfirm', { name: group.name }),
        onOk: () => {
          this.poolData.groups.splice(index, 1);
          this.version++;
        },
      });
    },
    addInstance(groupIndex) {
      const group = this.getGroup(groupIndex);
      const insts = group.instances || [];
      if (insts.length >= 2) {
        this.$Message.warning(this.$t('eppPool.instanceCountMax'));
        return;
      }
      if (!group.instances) {
        this.$set(group, 'instances', []);
      }
      group.instances.push({ id: '', host: '', port: 9002 });
      this.version++;
    },
    removeInstance(groupIndex, instIndex) {
      const group = this.getGroup(groupIndex);
      group.instances.splice(instIndex, 1);
      this.version++;
      this.refreshErrorFields();
    },
    renderExpandContent(h, groupIndex) {
      const group = this.getGroup(groupIndex);
      const insts = group.instances || [];
      const children = [];

      const borderStyle = '1px solid #dcdee2';
      const thStyle =
        'background:#f8f8f9;border:' +
        borderStyle +
        ';padding:8px 12px;text-align:left;font-weight:600;color:#515a6e;font-size:12px;';
      const tdStyle =
        'border:' + borderStyle + ';padding:6px 12px;font-size:12px;';

      if (!insts.length) {
        children.push(
          h(
            'span',
            { style: 'color:#c5c8ce;font-size:12px;' },
            this.$t('eppPool.noInstance'),
          ),
        );
      } else {
        const headCells = [
          h('th', { style: thStyle }, this.$t('eppPool.instanceId')),
          h('th', { style: thStyle }, this.$t('eppPool.host')),
          h('th', { style: thStyle + 'width:170px;' }, this.$t('eppPool.port')),
        ];
        if (this.editing) {
          headCells.push(
            h(
              'th',
              { style: thStyle + 'width:90px;' },
              this.$t('com.operation'),
            ),
          );
        }

        const bodyRows = insts.map((inst, index) => {
          const cells = [];
          if (this.editing) {
            const formItem = (field, rules, child) =>
              h(
                'FormItem',
                {
                  props: {
                    prop: `groups.${groupIndex}.instances.${index}.${field}`,
                    rules,
                  },
                },
                [child],
              );
            cells.push(
              h('td', { style: tdStyle }, [
                formItem(
                  'id',
                  this.instanceIdRules(groupIndex, index),
                  h('Input', {
                    props: {
                      value: this.getInstance(groupIndex, index).id,
                      placeholder: this.$t('eppPool.instanceId'),
                      size: 'small',
                    },
                    style: 'width:100%;',
                    on: {
                      input: (val) => {
                        this.$set(
                          this.getInstance(groupIndex, index),
                          'id',
                          val,
                        );
                      },
                    },
                  }),
                ),
              ]),
              h('td', { style: tdStyle }, [
                formItem(
                  'host',
                  this.instanceHostRules(groupIndex, index),
                  h('Input', {
                    props: {
                      value: this.getInstance(groupIndex, index).host,
                      placeholder: this.$t('eppPool.host'),
                      size: 'small',
                    },
                    style: 'width:100%;',
                    on: {
                      input: (val) => {
                        this.$set(
                          this.getInstance(groupIndex, index),
                          'host',
                          val,
                        );
                        this.refreshHostPortFields(groupIndex, index);
                      },
                    },
                  }),
                ),
              ]),
              h('td', { style: tdStyle }, [
                formItem(
                  'port',
                  this.instancePortRules(groupIndex, index),
                  h('InputNumber', {
                    props: {
                      value: this.getInstance(groupIndex, index).port,
                      min: 1,
                      max: 65535,
                      size: 'small',
                      activeChange: true,
                    },
                    style: 'width:100%;',
                    on: {
                      'on-change': (val) => {
                        this.$set(
                          this.getInstance(groupIndex, index),
                          'port',
                          val,
                        );
                        this.refreshHostPortFields(groupIndex, index);
                      },
                    },
                  }),
                ),
              ]),
              h('td', { style: tdStyle }, [
                h(
                  'Button',
                  {
                    props: { type: 'error', size: 'small' },
                    on: {
                      click: () => this.removeInstance(groupIndex, index),
                    },
                  },
                  this.$t('eppPool.deleteInstance'),
                ),
              ]),
            );
          } else {
            cells.push(
              h('td', { style: tdStyle }, inst.id),
              h('td', { style: tdStyle }, inst.host),
              h('td', { style: tdStyle }, String(inst.port)),
            );
          }
          return h('tr', { key: `inst-${index}` }, cells);
        });

        children.push(
          h(
            'table',
            {
              style:
                'border-collapse:collapse;max-width:700px;width:100%;margin-bottom:4px;',
            },
            [
              h('thead', [h('tr', headCells)]),
              h('tbody', bodyRows),
            ],
          ),
        );
      }

      if (this.editing) {
        children.push(
          h('div', { style: 'margin-top:8px;' }, [
            h(
              'Button',
              {
                props: { type: 'primary', size: 'small' },
                on: {
                  click: () => this.addInstance(groupIndex),
                },
              },
              this.$t('eppPool.addInstance'),
            ),
          ]),
        );
      }

      return h(
        'div',
        {
          style: 'padding:12px 16px 16px 56px;background:#f8f8f9;',
        },
        children,
      );
    },
  },
};
</script>
<style scoped>
.proto-epp-summary {
  font-size: 13px;
  color: #515a6e;
}
.epp-pool-table /deep/ .ivu-form-item {
  margin-bottom: 0;
}
.epp-pool-table /deep/ .ivu-form-item-error-tip {
  position: static;
  line-height: 1.5;
  padding-top: 4px;
  white-space: normal;
  word-break: break-word;
}
.epp-pool-table /deep/ .ivu-table-cell-with-expand {
  padding: 0;
}
.epp-pool-table /deep/ .ivu-table-cell-expand .ivu-icon {
  display: none;
}
.epp-pool-table /deep/ .ivu-table-cell-expand::before {
  content: '▶';
  color: #2d8cf0;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.epp-pool-table /deep/ .ivu-table-cell-expand-expanded {
  transform: none;
}
.epp-pool-table /deep/ .ivu-table-cell-expand-expanded::before {
  content: '▼';
}
</style>
