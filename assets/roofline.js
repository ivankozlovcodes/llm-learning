/* ============================================================
   Roofline chart.

   A machine can never exceed  min(peak compute, bandwidth × operational
   intensity).  The bend — the ridge point — sits at
        OI_ridge = peak compute ÷ memory bandwidth
   Workloads to the left of it are memory bound; to the right, compute bound.

   Decode has an operational intensity of ~2 FLOPs/byte. Prefill has roughly
   2 × prompt length. That is the whole reason they behave differently.

   Drop <div class="roofline" data-roofline></div> into a lesson.
   ============================================================ */

(function () {
  'use strict';

  // ops = peak throughput in TOPS/TFLOPS, bw = GB/s
  var MACHINES = [
    { id: 'orinnano',  name: 'Jetson Orin Nano (68 GB/s, 40 TOPS)',    ops: 40,   bw: 68  },
    { id: 'orinsuper', name: 'Jetson Orin Nano Super (102 GB/s, 67 TOPS)', ops: 67, bw: 102 },
    { id: 'agxorin',   name: 'Jetson AGX Orin (205 GB/s, 275 TOPS)',   ops: 275,  bw: 205 },
    { id: 'thor',      name: 'Jetson AGX Thor (273 GB/s, 2070 TFLOPS FP4)', ops: 2070, bw: 273 },
    { id: 'spark',     name: 'DGX Spark (273 GB/s, ~1000 TFLOPS FP4)', ops: 1000, bw: 273 },
    { id: 'm1max',     name: 'M1 Max (400 GB/s, ~21 TFLOPS FP16)',     ops: 21,   bw: 400 },
    { id: 'hailo10h',  name: 'Hailo-10H (~34 GB/s, 40 TOPS INT4)',     ops: 40,   bw: 34  }
  ];

  var WORKLOADS = [
    { id: 'decode',   name: 'Decode (1 token at a time)', oi: 2 },
    { id: 'pf512',    name: 'Prefill, 512-token prompt',  oi: 1024 },
    { id: 'pf8k',     name: 'Prefill, 8k-token prompt',   oi: 16384 }
  ];

  var W = 560, H = 300, PAD = { l: 52, r: 16, t: 16, b: 42 };
  var X0 = 0.5, X1 = 1e5;          // operational intensity range, FLOPs/byte
  var Y0 = 0.5, Y1 = 4000;         // throughput range, TFLOPS

  function lx(v) { return PAD.l + (Math.log10(v) - Math.log10(X0)) / (Math.log10(X1) - Math.log10(X0)) * (W - PAD.l - PAD.r); }
  function ly(v) { return H - PAD.b - (Math.log10(v) - Math.log10(Y0)) / (Math.log10(Y1) - Math.log10(Y0)) * (H - PAD.t - PAD.b); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  document.querySelectorAll('[data-roofline]').forEach(function (root) {
    root.classList.add('roofline');
    root.innerHTML =
      '<header><span class="tag">Roofline</span>' +
      '<p class="sub">Where the compute ceiling meets the bandwidth ceiling — and which side your workload sits on.</p></header>' +
      '<div class="controls">' +
        '<div class="field"><label>Machine</label><select data-f="machine">' +
          MACHINES.map(function (m) { return '<option value="' + m.id + '"' + (m.id === (root.dataset.machine || 'orinsuper') ? ' selected' : '') + '>' + m.name + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Workload</label><select data-f="work">' +
          WORKLOADS.map(function (w) { return '<option value="' + w.id + '">' + w.name + '</option>'; }).join('') +
        '</select></div>' +
      '</div>' +
      '<div class="plot" data-o="plot"></div>' +
      '<div class="readout" data-o="readout"></div>';

    var el = {}; root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    var out = {}; root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function draw() {
      var m = MACHINES.filter(function (x) { return x.id === el.machine.value; })[0];
      var w = WORKLOADS.filter(function (x) { return x.id === el.work.value; })[0];

      var ridge = m.ops * 1e12 / (m.bw * 1e9);            // FLOPs per byte
      var achieved = Math.min(m.ops, m.bw * w.oi / 1000);  // TFLOPS (bw GB/s x OI = GFLOPs/s -> /1000)
      var util = achieved / m.ops * 100;

      var s = [];
      // log grid
      for (var e = 0; e <= 5; e++) {
        var xv = Math.pow(10, e); if (xv < X0 || xv > X1) continue;
        s.push('<line class="grid-line" x1="' + lx(xv).toFixed(1) + '" y1="' + PAD.t + '" x2="' + lx(xv).toFixed(1) + '" y2="' + (H - PAD.b) + '"/>');
        s.push('<text class="tick" x="' + lx(xv).toFixed(1) + '" y="' + (H - PAD.b + 13) + '" text-anchor="middle">' + (e === 0 ? '1' : '10^' + e) + '</text>');
      }
      for (var f = 0; f <= 3; f++) {
        var yv = Math.pow(10, f); if (yv < Y0 || yv > Y1) continue;
        s.push('<line class="grid-line" x1="' + PAD.l + '" y1="' + ly(yv).toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + ly(yv).toFixed(1) + '"/>');
        s.push('<text class="tick" x="' + (PAD.l - 6) + '" y="' + (ly(yv) + 3).toFixed(1) + '" text-anchor="end">' + (f === 0 ? '1' : '10^' + f) + '</text>');
      }
      s.push('<line class="axis-line" x1="' + PAD.l + '" y1="' + (H - PAD.b) + '" x2="' + (W - PAD.r) + '" y2="' + (H - PAD.b) + '"/>');
      s.push('<line class="axis-line" x1="' + PAD.l + '" y1="' + PAD.t + '" x2="' + PAD.l + '" y2="' + (H - PAD.b) + '"/>');

      // roofline: slope bw until ridge, then flat at peak
      var xr = clamp(ridge, X0, X1);
      var yStart = clamp(m.bw * X0 / 1000, Y0, Y1);
      s.push('<polyline class="roof" points="' +
        lx(X0).toFixed(1) + ',' + ly(yStart).toFixed(1) + ' ' +
        lx(xr).toFixed(1) + ',' + ly(clamp(m.ops, Y0, Y1)).toFixed(1) + ' ' +
        lx(X1).toFixed(1) + ',' + ly(clamp(m.ops, Y0, Y1)).toFixed(1) + '"/>');
      s.push('<line class="ridge" x1="' + lx(xr).toFixed(1) + '" y1="' + ly(clamp(m.ops, Y0, Y1)).toFixed(1) + '" x2="' + lx(xr).toFixed(1) + '" y2="' + (H - PAD.b) + '"/>');
      s.push('<text class="region" x="' + (lx(xr) - 6).toFixed(1) + '" y="' + (PAD.t + 12) + '" text-anchor="end">memory bound</text>');
      s.push('<text class="region" x="' + (lx(xr) + 6).toFixed(1) + '" y="' + (PAD.t + 12) + '">compute bound</text>');

      // workload marker
      var cls = w.id === 'decode' ? 'decode' : 'prefill';
      var px = lx(clamp(w.oi, X0, X1)), py = ly(clamp(achieved, Y0, Y1));
      s.push('<circle class="pt ' + cls + '" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5.5"/>');
      var anchor = px > W - 130 ? 'end' : 'start';
      var dx = anchor === 'end' ? -10 : 10;
      s.push('<text class="ptlabel ' + cls + '" x="' + (px + dx).toFixed(1) + '" y="' + (py - 8).toFixed(1) + '" text-anchor="' + anchor + '">' +
             achieved.toFixed(achieved < 10 ? 2 : 0) + ' TFLOPS · ' + util.toFixed(util < 1 ? 2 : 0) + '% of peak</text>');

      s.push('<text class="axlabel" x="' + ((W + PAD.l) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">operational intensity — FLOPs per byte</text>');
      s.push('<text class="axlabel" transform="translate(13,' + ((H - PAD.b + PAD.t) / 2) + ') rotate(-90)" text-anchor="middle">TFLOPS achievable</text>');

      out.plot.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Roofline chart">' + s.join('') + '</svg>';

      out.readout.innerHTML =
        '<strong>' + m.name.split(' (')[0] + '</strong> needs an operational intensity of <span class="big">' +
        ridge.toFixed(0) + ' FLOPs/byte</span> before its compute units are the limit. ' +
        '<strong>' + w.name.split(' (')[0] + '</strong> supplies about <span class="big">' + w.oi.toLocaleString('en-US') +
        '</span>. ' +
        (w.oi < ridge
          ? 'That is short of the ridge, so this workload is <strong>memory bound</strong> and uses only <strong>' +
            util.toFixed(util < 1 ? 2 : 0) + '%</strong> of the advertised compute. Buying more TOPS changes nothing here.'
          : 'That clears the ridge, so this workload is <strong>compute bound</strong> and the TOPS rating finally means something.');
    }

    root.addEventListener('change', draw);
    draw();
  });
})();
