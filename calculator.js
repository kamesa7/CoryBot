
var Gi = 0;
glob.Calc = (BEquation) => {
  // function glob.Calc(BEquation) {
  try {
    equation = new String(BEquation);
    equation.value = preCalc(BEquation);

    if (equation.value == "") return "¬";

    return equation.value + " = " + Calculator(equation, 0).value + "です";
  }
  catch (e) {
    console.log(e);
  }
}

function preCalc(equation) {
  try {
    equation = equation.replace(/http/g, "¬");
    //equation = equation.replace(/^[.*\]/g, "a");
    equation = equation.replace(/÷/g, "/");
    equation = equation.replace(/×/g, "*");
    // equation = equation.replace(/arc/g, "a");
    // equation = equation.replace(/sin/g, "s");
    // equation = equation.replace(/cos/g, "c");
    // equation = equation.replace(/tan/g, "t");
    equation = equation.replace(/log/gi, "対");
    equation = equation.replace(/ln/gi, "対");
    equation = equation.replace(/exp/gi, "e^");
    //equation = equation.replace(/k/g, "*1000");
    equation = equation.replace(/permutation/gi, "P");
    equation = equation.replace(/combination/gi, "C");
    equation = equation.replace(/素因数/g, "素");
    equation = equation.replace(/prime/gi, "素");
    equation = equation.replace(/pi/gi, String(Math.PI));
    equation = equation.replace(/π/g, String(Math.PI));
    equation = equation.replace(/e/gi, String(Math.E));

    for (var index = 0; index < equation.length; index++) {
      switch (equation[index]) {
        case '¬':
          return "¬";
        case '!':
        case '^':
        case '+':
        case '*':
        case '/':
        case '%':
        case '.':
        // case 'a':
        // case 's':
        // case 'c':
        // case 't':
        case '対':
        case '素':
        case 'P':
        case 'C':
        case ')':
          break;
        case '(':
          if (index - 1 >= 0 && IsntOperand(equation[index - 1])) {
            equation = insert(equation, index, "*");
            index++;
          }
          break;
        case '-':
          if (index - 1 >= 0 && equation[index - 1] != '(')//-2+.. または..)-2以外のとき
          {
            equation = insert(equation, index, "+");
            index++;
          }
          break;
        default://上記の記号と数字以外は除去
          if (!IsntOperand(equation[index])) {
            equation = remove(equation, index, index + 1);
            index--;
          }
          break;
      }
    }
    return equation;
  } catch (e) {
    return "¬";
  }
}

function Calculator(BEquation, depth) {
  var tabs = "";
  for (var i = 0; i < depth; i++) {
    tabs += "   ";
  }
  WriteDetail(tabs + "in " + BEquation.value);
  try {
    var curves = 0;
    var curveInd = -1;
    for (var index = 0; index < BEquation.value.length; index++) {
      switch (BEquation.value[index]) {
        case '(':
          if (curves == 0) {
            curveInd = index;
          }
          curves++;
          break;
        case ')':
          curves--;
          if (curves == 0) {
            var cuv = BEquation.value.substring(curveInd + 1, index);
            var gos = new String(cuv);
            gos.value = cuv;
            var numstr = Calculator(gos, depth + 1);
            BEquation.value = remove(BEquation.value, curveInd, index + 1);
            BEquation.value = insert(BEquation.value, curveInd, String(numstr.value));
            index = curveInd;
            WriteDetail(tabs + BEquation.value);
          }
          break;
      }
    }
    equation = new String(BEquation.value);
    equation.value = BEquation.value;

    equation.value = equation.value.replace(/--/g, "+");

    for (var index = 0; index < equation.value.length; index++) {
      switch (equation.value[index]) {
        case '!':
          var num = GetPreviosremove(equation, index);
          index = Gi;
          equation.value = remove(equation.value, index, index + 1);
          equation.value = insert(equation.value, index, String(Factorial(num)));
          WriteDetail(tabs + equation.value);
          break;
        case '^':
          num1 = GetPreviosremove(equation, index);
          index = Gi;
          num2 = GetNextremove(equation, index);
          equation.value = insert(equation.value, index, String(Math.pow(num1, num2)));
          WriteDetail(tabs + equation.value);
          break;
        // case 's':
        //   var num3 = GetNextremove(equation, index);
        //   equation.value = insert(equation.value, index, String(Math.sin(num3)));
        //   WriteDetail(tabs + equation.value);
        //   break;
        // case 'c':
        //   var num4 = GetNextremove(equation, index);
        //   equation.value = insert(equation.value, index, String(Math.cos(num4)));
        //   WriteDetail(tabs + equation.value);
        //   break;
        // case 't':
        //   var num5 = GetNextremove(equation, index);
        //   equation.value = insert(equation.value, index, String(Math.tan(num5)));
        //   WriteDetail(tabs + equation.value);
        //   break;
        case '対':
          var num6 = GetNextremove(equation, index);
          equation.value = insert(equation.value, index, String(Math.log(num6)));
          WriteDetail(tabs + equation.value);
          break;
        /*
        case 'a':
          equation.value = remove(equation.value, index, index + 1);
          switch (equation.value[index]) {
            case 's':
              var num7 = GetNextremove(equation, index);
              equation.value = insert(equation.value, index, String(Math.asin(num7)));
              break;
            case 'c':
              var num8 = GetNextremove(equation, index);
              equation.value = insert(equation.value, index, String(Math.acos(num8)));
              break;
            case 't':
              var num9 = GetNextremove(equation, index);
              equation.value = insert(equation.value, index, String(Math.atan(num9)));
              break;
          }
          WriteDetail(tabs + equation.value);
          break;
        */
        case 'P':
          num1 = GetPreviosremove(equation, index);
          index = Gi;
          num2 = GetNextremove(equation, index);
          equation.value = insert(equation.value, index, String(Permutation(num1, num2)));
          WriteDetail(tabs + equation.value);
          break;
        case 'C':
          num1 = GetPreviosremove(equation, index);
          index = Gi;
          num2 = GetNextremove(equation, index);
          if (num2 - num1 < num1) num3 = num2 - num1;
          else num3 = num1;
          equation.value = insert(equation.value, index, String(Combination(num1, num3)));
          WriteDetail(tabs + equation.value);
          break;
      }
    }

    for (var index = 0; index < equation.value.length; index++) {
      switch (equation.value[index]) {
        case '*':
          num1 = GetPreviosremove(equation, index);
          index = Gi;
          num2 = GetNextremove(equation, index);
          equation.value = insert(equation.value, index, String(num1 * num2));
          WriteDetail(tabs + equation.value);
          break;
        case '/':
          num1 = GetPreviosremove(equation, index);
          index = Gi;
          num2 = GetNextremove(equation, index);
          if (num2 == 0) {
            equation.value = insert(equation.value, index, "0除算");
          } else {
            equation.value = insert(equation.value, index, String(num1 / num2));
          }
          WriteDetail(tabs + equation.value);
          break;
        case '%':
          num1 = GetPreviosremove(equation, index);
          index = Gi;
          num2 = GetNextremove(equation, index);
          equation.value = insert(equation.value, index, String(num1 % num2));
          WriteDetail(tabs + equation.value);
          break;
      }
    }

    for (var index = 0; index < equation.value.length; index++) {
      switch (equation.value[index]) {
        case '+':
          num1 = GetPreviosremove(equation, index);
          index = Gi;
          num2 = GetNextremove(equation, index);
          equation.value = insert(equation.value, index, String(num1 + num2));
          WriteDetail(tabs + equation.value);
          break;
      }
    }
    for (var index = 0; index < equation.value.length; index++) {
      switch (equation.value[index]) {
        case '素':
          var num7 = GetNextremove(equation, index);
          var prime = Primes(num7);
          equation.value = insert(equation.value, index, prime);
          WriteDetail(tabs + equation.value);
          index += prime.length;
          break;
      }
    }

    WriteDetail(tabs + "out " + equation.value);
    if (equation.value.match(/e/)) {
      equation.value = "*指数表記 " + equation.value;
    }
    return equation;
  } catch (e) {
    console.log(e);
    WriteDetail(tabs + "Error");
    equation.value = "無効な式";
    return equation;
  }
}

/// 階乗
function Factorial(num) {
  if (num <= 1) return 1;
  return num * Factorial(num - 1);
}

/// 順列
function Permutation(num1, num2) {
  if (num2 == 1) {
    return num1;
  }
  return num1 * Permutation(num1 - 1, num2 - 1);
}

/// 組み合わせ
function Combination(num1, num2) {
  if (num2 == 0) {
    return 1;
  }
  return (num1 - num2 + 1) * Combination(num1, num2 - 1) / num2;
}

function Primes(num) {
  var limit = Math.ceil(num / 2);
  var div = 2;
  var ret = ""
  while (div <= num && div <= limit) {
    if (num % div == 0) {
      num /= div;
      ret += String(div) + "*";
    } else {
      div++;
    }
  }
  if (ret.length == 0) return num;
  else return ret.substring(0, ret.length - 1);
}

/// 演算子の前の値を得て数値を削除する
function GetPreviosremove(equation, index) {
  var numInd = index - 1;
  while (numInd >= 0 && IsntOperand(equation.value[numInd])) numInd--;
  numInd++;
  var ret = Number(equation.value.substring(numInd, index));
  equation.value = remove(equation.value, numInd, index);
  Gi = index - (index - numInd);
  return ret;
}

/// 演算子indexから始まる値を得る　演算子も削除する
function GetNextremove(equation, index) {
  var numInd = index + 1;
  while (numInd < equation.value.length && IsntOperand(equation.value[numInd])) numInd++;
  ret = Number(equation.value.substring(index + 1, numInd));
  equation.value = remove(equation.value, index, numInd);
  return ret;
}

function remove(equation, start, end) {
  return equation.substring(0, start) + equation.substring(end, equation.length);
}

function insert(equation, index, str) {
  return equation.substring(0, index) + str + equation.substring(index, equation.length);
}

/// 数字や数字の構成要素である場合真
function IsntOperand(ch) {
  //console.log(ch);
  if (('0' <= ch && ch <= '9') || ch == '-' || ch == '.') {
    return true;
  } else {
    return false;
  }
}

/// コンソールに出力する
function WriteDetail(str) {
  console.log("[Calc] " + str);
}