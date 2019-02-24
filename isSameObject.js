
/**
 * ２つの値の内容が同じか判定する関数  ※ 「0 と -0」 や 「JavaObject の内容」は区別しません。
 *
 * @param {*} val1 - 比較対象の値
 * @param {*} val2 - 比較対象の値
 * @return {boolean} 同じなら true、違うなら　false を返す
 */
function isSame(val1, val2) {
    // 型を判定する関数を使って、val1 と val2 の両方が判定対象の型なら true を返す関数を定義
    var test = function (checkFunction) {
      return checkFunction.call(null, val1) && checkFunction.call(null, val2);
    }
  
    // 型が違えば false
    if (Object.prototype.toString.call(val1) !== Object.prototype.toString.call(val2)) return false;
  
    // 配列型なら isSameArray_() で比較
    if (test(isArray)) return isSameArray_(val1, val2);
  
    // オブジェクト型なら isSameObject_() で比較
    if (test(isObject)) return isSameObject_(val1, val2);
  
    // JSON.stringify() で判定できない型は、String 型に変換して比較
    if (test(isUndefined) || test(isDate) || test(isFunction) || test(isRegExp) || test(isError)) return val1 + '' === val2 + '';
  
    // 型は同じだが（Number 型）、判定が必要な値は String　型に変換して比較
    if (isNaN(val1) || isNaN(val2) || isInfinity(val1) || isInfinity(val2)) return val1 + '' === val2 + '';
  
    // JSON.stringify() で判定できる型なら比較
    if (test(isNull) || test(isString) || test(isNumber) || test(isBoolean)) return JSON.stringify(val1) === JSON.stringify(val2);
  
    // JavaObject （Google Apps Script のオブジェクト）を簡易比較
    if (test(isJavaObject)) return val1 + '' === val2 + '';
  
    // 上記以外は false
    return false;
  }
  
  /**
   * ２つの２次元配列の要素が同じか判定する関数  ※ 配列の並び順も含めて判定します。
   *
   * @param {Array} arr1 - 比較対象の２次元配列
   * @param {Array} arr2 - 比較対象の２次元配列
   * @return {boolean} 同じなら true、違うなら　false を返す
   */
  function isSameArray_(arr1, arr2) {
    // 要素数が異なれば false を返却
    if (arr1.length !== arr2.length) return false;
  
    // 空の配列同士なら true を返却
    if (arr1.length === 0) return true;
  
    // 各要素を走査
    return arr1.every(function (elem1, idx) {
      var elem2 = arr2[idx];
      return isSame(elem1, elem2);
    });
  }
  
  /**
   * ２つのオブジェクトの内容が同じか判定する関数
   *
   * @param {Object} obj1 - 比較対象のオブジェクト
   * @param {Object} obj2 - 比較対象のオブジェクト
   * @return {boolean} 同じなら true、違うなら　false を返す
   */
  function isSameObject_(obj1, obj2) {
    // キーを取得してソート  ※ sort() は破壊的なので slice() で複製してから実行
    var keysOfObj1 = Object.keys(obj1).slice().sort();
    var keysOfObj2 = Object.keys(obj2).slice().sort();
  
    // キー同士が異なれば false を返却
    if (!isSameArray_(keysOfObj1, keysOfObj2)) return false;
  
    // 空のオブジェクト同士なら true を返却
    if (keysOfObj1.length === 0) return true;
  
    // キー毎に各プロパティを走査
    return keysOfObj1.every(function (key) {
      var val1 = obj1[key];
      var val2 = obj2[key];
      return isSame(val1, val2);
    });
  }
  
  /**
  * NaN か判定する関数
  */
  function isNaN(value) {
    return Number.isNaN(value);
  }
  
  /**
  * Infinity か判定する関数
  */
  function isInfinity(value) {
    return value === Infinity || value === -Infinity;
  }
  
  /**
  * 未定義か判定する関数
  */
  function isUndefined(value) {
    return typeof value === "undefined" ? true : false;
  }
  
  /**
  * null か判定する関数
  */
  function isNull(value) {
    return value === null ? true : false;
  }
  
  /**
  * 値が特定の型かどうか判定する関数
  * http://bonsaiden.github.io/JavaScript-Garden/ja/#types.typeof
  */
  function is_(type, obj) {
    var clas = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && clas === type;
  }
  
  /**
  * 値が String 型かどうか判定する関数
  */
  function isString(value) {
    return is_('String', value);
  }
  
  /**
  * 値が Number 型かどうか判定する関数
  */
  function isNumber(value) {
    return is_('Number', value);
  }
  
  /**
  * 値が Boolean 型かどうか判定する関数
  */
  function isBoolean(value) {
    return is_('Boolean', value);
  }
  
  /**
  * 値が Date 型かどうか判定する関数
  */
  function isDate(value) {
    return is_('Date', value);
  }
  
  /**
  * 値が Error 型かどうか判定する関数
  */
  function isError(value) {
    return is_('Error', value);
  }
  
  /**
  * 値が Array 型かどうか判定する関数
  */
  function isArray(value) {
    return is_('Array', value);
  }
  
  /**
  * 値が Function 型かどうか判定する関数
  */
  function isFunction(value) {
    return is_('Function', value);
  }
  
  /**
  * 値が RegExp 型かどうか判定する関数
  */
  function isRegExp(value) {
    return is_('RegExp', value);
  }
  
  /**
  * 値が Object 型かどうか判定する関数
  */
  function isObject(value) {
    return is_('Object', value);
  }
  
  /**
  * 値が Javasctip でラップされた Java オブジェクトかどうか判定する関数
  */
  function isJavaObject(value) {
    return is_('JavaObject', value);
  }

  module.exports = isSame;