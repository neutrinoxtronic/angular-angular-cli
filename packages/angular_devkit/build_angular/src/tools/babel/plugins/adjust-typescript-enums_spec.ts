/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { transformSync } from '@babel/core';
// eslint-disable-next-line import/no-extraneous-dependencies
import { format } from 'prettier';
import adjustTypeScriptEnums from './adjust-typescript-enums';

const NO_CHANGE = Symbol('NO_CHANGE');

function testCase({
  input,
  expected,
}: {
  input: string;
  expected: string | typeof NO_CHANGE;
}): jasmine.ImplementationCallback {
  return async () => {
    const result = transformSync(input, {
      configFile: false,
      babelrc: false,
      plugins: [[adjustTypeScriptEnums]],
    });
    if (!result?.code) {
      fail('Expected babel to return a transform result.');
    } else {
      expect(await format(result.code, { parser: 'babel' })).toEqual(
        await format(expected === NO_CHANGE ? input : expected, { parser: 'babel' }),
      );
    }
  };
}

describe('adjust-typescript-enums Babel plugin', () => {
  it(
    'wraps unexported TypeScript enums',
    testCase({
      input: `
        var ChangeDetectionStrategy;
        (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
            ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
        })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
      `,
      expected: `
        var ChangeDetectionStrategy = /*#__PURE__*/ (() => {
          ChangeDetectionStrategy = ChangeDetectionStrategy || {};
          ChangeDetectionStrategy[(ChangeDetectionStrategy["OnPush"] = 0)] = "OnPush";
          ChangeDetectionStrategy[(ChangeDetectionStrategy["Default"] = 1)] = "Default";
          return ChangeDetectionStrategy;
        })();
      `,
    }),
  );

  it(
    'wraps exported TypeScript enums',
    testCase({
      input: `
        export var ChangeDetectionStrategy;
        (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
            ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
        })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
      `,
      expected: `
        export var ChangeDetectionStrategy = /*#__PURE__*/ (() => {
          ChangeDetectionStrategy = ChangeDetectionStrategy || {};
          ChangeDetectionStrategy[(ChangeDetectionStrategy["OnPush"] = 0)] = "OnPush";
          ChangeDetectionStrategy[(ChangeDetectionStrategy["Default"] = 1)] = "Default";
          return ChangeDetectionStrategy;
        })();
      `,
    }),
  );

  it(
    'wraps TypeScript enums with custom numbering',
    testCase({
      input: `
        export var ChangeDetectionStrategy;
        (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 5] = "OnPush";
            ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 8] = "Default";
        })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
      `,
      expected: `
        export var ChangeDetectionStrategy = /*#__PURE__*/ (() => {
          ChangeDetectionStrategy = ChangeDetectionStrategy || {};
          ChangeDetectionStrategy[(ChangeDetectionStrategy["OnPush"] = 5)] = "OnPush";
          ChangeDetectionStrategy[(ChangeDetectionStrategy["Default"] = 8)] = "Default";
          return ChangeDetectionStrategy;
        })();
      `,
    }),
  );

  it(
    'wraps string-based TypeScript enums',
    testCase({
      input: `
      var NotificationKind;
      (function (NotificationKind) {
          NotificationKind["NEXT"] = "N";
          NotificationKind["ERROR"] = "E";
          NotificationKind["COMPLETE"] = "C";
      })(NotificationKind || (NotificationKind = {}));
      `,
      expected: `
        var NotificationKind = /*#__PURE__*/ (() => {
          NotificationKind = NotificationKind || {};
          NotificationKind["NEXT"] = "N";
          NotificationKind["ERROR"] = "E";
          NotificationKind["COMPLETE"] = "C";
          return NotificationKind;
        })();
      `,
    }),
  );

  it(
    'wraps enums that were renamed due to scope hoisting',
    testCase({
      input: `
        var NotificationKind$1;
        (function (NotificationKind) {
            NotificationKind["NEXT"] = "N";
            NotificationKind["ERROR"] = "E";
            NotificationKind["COMPLETE"] = "C";
        })(NotificationKind$1 || (NotificationKind$1 = {}));
      `,
      expected: `
        var NotificationKind$1 = /*#__PURE__*/ (() => {
          (function (NotificationKind) {
              NotificationKind["NEXT"] = "N";
              NotificationKind["ERROR"] = "E";
              NotificationKind["COMPLETE"] = "C";
          })(NotificationKind$1 || (NotificationKind$1 = {}));
          return NotificationKind$1;
        })();
      `,
    }),
  );

  it(
    'maintains multi-line comments',
    testCase({
      input: `
        /**
         * Supported http methods.
         * @deprecated use @angular/common/http instead
         */
        var RequestMethod;
        (function (RequestMethod) {
            RequestMethod[RequestMethod["Get"] = 0] = "Get";
            RequestMethod[RequestMethod["Post"] = 1] = "Post";
            RequestMethod[RequestMethod["Put"] = 2] = "Put";
            RequestMethod[RequestMethod["Delete"] = 3] = "Delete";
            RequestMethod[RequestMethod["Options"] = 4] = "Options";
            RequestMethod[RequestMethod["Head"] = 5] = "Head";
            RequestMethod[RequestMethod["Patch"] = 6] = "Patch";
        })(RequestMethod || (RequestMethod = {}));
      `,
      expected: `
        /**
         * Supported http methods.
         * @deprecated use @angular/common/http instead
         */
        var RequestMethod = /*#__PURE__*/ (() => {
          RequestMethod = RequestMethod || {};
          RequestMethod[(RequestMethod["Get"] = 0)] = "Get";
          RequestMethod[(RequestMethod["Post"] = 1)] = "Post";
          RequestMethod[(RequestMethod["Put"] = 2)] = "Put";
          RequestMethod[(RequestMethod["Delete"] = 3)] = "Delete";
          RequestMethod[(RequestMethod["Options"] = 4)] = "Options";
          RequestMethod[(RequestMethod["Head"] = 5)] = "Head";
          RequestMethod[(RequestMethod["Patch"] = 6)] = "Patch";
          return RequestMethod;
        })();
      `,
    }),
  );

  it(
    'does not wrap TypeScript enums with side effect values',
    testCase({
      input: `
        export var ChangeDetectionStrategy;
        (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = console.log('foo');
            ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
        })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
      `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'does not wrap object literals similar to TypeScript enums',
    testCase({
      input: `
        const RendererStyleFlags3 = {
            Important: 1,
            DashCase: 2,
        };
        if (typeof RendererStyleFlags3 === 'object') {
          RendererStyleFlags3[RendererStyleFlags3.Important] = 'DashCase';
        }
        RendererStyleFlags3[RendererStyleFlags3.Important] = 'Important';
      `,
      expected: NO_CHANGE,
    }),
  );

  it(
    'wraps TypeScript enums',
    testCase({
      input: `
        var ChangeDetectionStrategy;
        (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
            ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
        })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
      `,
      expected: `
        var ChangeDetectionStrategy = /*#__PURE__*/ (() => {
          ChangeDetectionStrategy = ChangeDetectionStrategy || {};
          ChangeDetectionStrategy[(ChangeDetectionStrategy["OnPush"] = 0)] = "OnPush";
          ChangeDetectionStrategy[(ChangeDetectionStrategy["Default"] = 1)] = "Default";
          return ChangeDetectionStrategy;
        })();
      `,
    }),
  );

  it(
    'should not wrap TypeScript enums if the declaration identifier has been renamed to avoid collisions',
    testCase({
      input: `
        var ChangeDetectionStrategy$1;
        (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
            ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
        })(ChangeDetectionStrategy$1 || (ChangeDetectionStrategy$1 = {}));
      `,
      expected: `
        var ChangeDetectionStrategy$1 = /*#__PURE__*/ (() => {
          (function (ChangeDetectionStrategy) {
            ChangeDetectionStrategy[(ChangeDetectionStrategy["OnPush"] = 0)] = "OnPush";
            ChangeDetectionStrategy[(ChangeDetectionStrategy["Default"] = 1)] = "Default";
          })(ChangeDetectionStrategy$1 || (ChangeDetectionStrategy$1 = {}));
          return ChangeDetectionStrategy$1;
        })();
      `,
    }),
  );
});
