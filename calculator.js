glob.Calc = Calculator

function Calculator(equation = "") {
  if (equation.match(/([\d\+\-\*\/\(\)\.^]+)/) && equation.match(/[\d\.]+[^\d\.]+[\d\.]+/)) {
    try {
      WriteDetail(equation)
      equation = equation.replace(/\^/g, "**")
      WriteDetail(equation)
      var ans = eval(equation)
      WriteDetail(ans)
      return ans;
    } catch (e) {
    }
  } else {
    return NaN
  }
}

/// コンソールに出力する
function WriteDetail(str) {
  console.log("[Calc] " + str);
}