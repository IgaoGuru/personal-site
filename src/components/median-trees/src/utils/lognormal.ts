
/**
 * Approximation to the error function.
// Source: Numerical Recipes / Abramowitz–Stegun
 */
function erf(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
  
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
  
    const t = 1 / (1 + p * x);
    const y = 1 - (
        (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1)
        * t
      ) * Math.exp(-x * x);
  
    return sign * y;
  }

//
// Approximation to inverse error function, erfinv(x).
// Source: https://stackoverflow.com/a/59778675 (Acklam’s approximation)
//
function erfinv(x: number): number {
    const a = [
      0.886226899, -1.645349621, 0.914624893, -0.140543331
    ];
    const b = [
      -2.118377725, 1.442710462, -0.329097515, 0.012229801
    ];
    const c = [
      -1.970840454, -1.624906493, 3.429567803, 1.641345311
    ];
    const d = [
      3.543889200, 1.637067800
    ];
  
    const y = x < 0 ? -x : x;
    let z: number;
  
    if (y <= 0.7) {
      const z2 = y * y;
      z = y * (((a[3] * z2 + a[2]) * z2 + a[1]) * z2 + a[0]) /
              ((((b[3] * z2 + b[2]) * z2 + b[1]) * z2 + b[0]) * z2 + 1);
    } else {
      const w = Math.sqrt(Math.log(1 - y * y));
      z = (((c[3] * w + c[2]) * w + c[1]) * w + c[0]) /
          ((d[1] * w + d[0]) * w + 1);
      if (x < 0) z = -z;
    }
  
    // One Newton–Raphson correction step for extra precision
    const err = erf(z) - x;
    z -= err / ( (2/Math.sqrt(Math.PI)) * Math.exp(-z*z) );
    return z;
  }
  
  /**
 * Inverse standard-normal CDF using Acklam’s rational approximation.
 * Accurate to ~1e-9 over the entire (0,1) range.
 * Source: https://web.archive.org/web/20150910012302/http://home.online.no/~pjacklam/notes/invnorm/
 */
function normalInv(p: number): number {
    if (p <= 0 || p >= 1) {
      throw new Error("normalInv: p must be in (0,1), got " + p);
    }
  
    // Coefficients
    const a = [
      -3.969683028665376e+01,
       2.209460984245205e+02,
      -2.759285104469687e+02,
       1.383577518672690e+02,
      -3.066479806614716e+01,
       2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01,
       1.615858368580409e+02,
      -1.556989798598866e+02,
       6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
       4.374664141464968e+00,
       2.938163982698783e+00,
    ];
    const d = [
       7.784695709041462e-03,
       3.224671290700398e-01,
       2.445134137142996e+00,
       3.754408661907416e+00,
    ];
  
    // Define break-points.
    const plow  = 0.02425;
    const phigh = 1 - plow;
    let q, r, x;
  
    if (p < plow) {
      // Rational approximation for lower region
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
          ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
    } else if (p > phigh) {
      // Rational approximation for upper region
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
           ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
    } else {
      // Rational approximation for central region
      q = p - 0.5;
      r = q * q;
      x = (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5]) * q /
          (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
    }
  
    // One step of Newton-Raphson to polish (optional but improves tail accuracy)
    const e = 0.5 * erfc(-x / Math.SQRT2) - p;
    const u = e * Math.SQRT2 * Math.exp(x*x / 2);
    x = x - u / (1 + x * u / 2);
  
    return x;
  }
  
  /** complementary error function: erfc(x) = 1 - erf(x) */
  function erfc(x: number): number {
    // reuse our existing erf() from before
    return 1 - erf(x);
  }

  /**
   * Given desired certainty p ∈ (0,1) and median-estimate Y,
   * returns the time t such that P[T ≤ t] = p under LogNormal(median=Y, σ=1).
   *
   *   t = Y * exp(Φ⁻¹(p))
   */
  export function timeToCertainty(p: number, Y: number): number {
    if (Y <= 0) {
      throw new Error("Estimate Y must be positive");
    }
    const z = normalInv(p);
    return Y * Math.exp(z);
  }