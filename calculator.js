glob.Calc = Calculator

function Calculator(equation = "") {
  try {
    WriteDetail(equation)
    equation = equation.replace(/(\d)\(/g, RegExp.$1 + "*(")
    WriteDetail(equation)
    var ans = eval(equation)
    WriteDetail(ans)
    return ans;
  } catch (e) {
    return NaN
  }
}

/// コンソールに出力する
function WriteDetail(str) {
  console.log("[Calc] " + str);
}