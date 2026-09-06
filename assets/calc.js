/* ============================================================
   Napkin-math calculator: predicts decode speed (tokens/sec)
   from memory bandwidth and bytes-read-per-token.

   Drop <div class="calc" data-calc></div> into any lesson and
   this script builds the whole widget. Presets are shared so
   every lesson uses the same hardware and model numbers.

   Model: tok/s = (bandwidth GB/s / bytes-per-token GB) x efficiency
   Weights only. KV cache is deliberately excluded (see lesson 2).
   ============================================================ */

(function () {
  'use strict';

  // --- shared preset tables -------------------------------------------------
  // bw   = peak memory bandwidth, GB/s (decimal GB, matching vendor spec sheets)
  // mem  = memory realistically available to the model, GB
  var MACHINES = [
    { id: 'm1max64',  name: 'MacBook Pro M1 Max 64 GB',   bw: 400,  mem: 48  },
    { id: 'm1pro32',  name: 'MacBook Pro M1 Pro 32 GB',   bw: 200,  mem: 24  },
    { id: 'm4max128', name: 'Mac Studio M4 Max 128 GB',   bw: 546,  mem: 96  },
    { id: 'spark',    name: 'NVIDIA DGX Spark 128 GB',    bw: 273,  mem: 110 },
    { id: 'strix',    name: 'AMD Strix Halo 128 GB',      bw: 256,  mem: 96  },
    { id: 'rtx3090',  name: 'RTX 3090 (24 GB)',           bw: 936,  mem: 23  },
    { id: 'rtx4090',  name: 'RTX 4090 (24 GB)',           bw: 1008, mem: 23  },
    { id: 'rtx3090x2',name: '2x RTX 3090 (48 GB)',        bw: 936,  mem: 46  },
    { id: 'orinnano', name: 'Jetson Orin Nano Super 8 GB',  bw: 102,  mem: 6.5 },
    { id: 'orinnx',   name: 'Jetson Orin NX 16 GB',          bw: 102,  mem: 14  },
    { id: 'agxorin',  name: 'Jetson AGX Orin 64 GB',         bw: 205,  mem: 56  },
    { id: 'thor',     name: 'Jetson AGX Thor 128 GB',        bw: 273,  mem: 115 },
    { id: 'hailo10h', name: 'Pi AI HAT+ 2 (Hailo-10H) 8 GB', bw: 34,   mem: 7   },
    { id: 'pi5',      name: 'Raspberry Pi 5, CPU only',      bw: 17,   mem: 14  },
    { id: 'macmini4', name: 'Mac mini M4',                   bw: 120,  mem: 22  },
    { id: 'macmini4p',name: 'Mac mini M4 Pro 64 GB',         bw: 273,  mem: 48  },
    { id: 'custom',   name: 'Custom…',                    bw: 400,  mem: 48  }
  ];

  // total  = total parameter count, billions
  // active = parameters actually read per token, billions (== total for dense)
  var MODELS = [
    { id: 'l8b',     name: 'Llama 3.1 8B (dense)',          total: 8.0,   active: 8.0  },
    { id: 'qwen32',  name: 'Qwen3 32B (dense)',             total: 32.8,  active: 32.8 },
    { id: 'l70b',    name: 'Llama 3.3 70B (dense)',         total: 70.6,  active: 70.6 },
    { id: 'oss20',   name: 'gpt-oss-20b (MoE)',             total: 20.9,  active: 3.6  },
    { id: 'oss120',  name: 'gpt-oss-120b (MoE)',            total: 116.8, active: 5.1  },
    { id: 'glmair',  name: 'GLM-4.5-Air (MoE)',             total: 106,   active: 12   },
    { id: 'qwen235', name: 'Qwen3-235B-A22B (MoE)',         total: 235,   active: 22   },
    { id: 'custom',  name: 'Custom…',                       total: 70.6,  active: 70.6 }
  ];

  // Effective bits per weight, including quantization metadata overhead.
  var QUANTS = [
    { id: 'f16',    name: 'F16  — unquantized',        bpw: 16   },
    { id: 'q8',     name: 'Q8_0 — 8-bit',              bpw: 8.5  },
    { id: 'q6k',    name: 'Q6_K — 6-bit',              bpw: 6.6  },
    { id: 'q5km',   name: 'Q5_K_M — 5-bit',            bpw: 5.7  },
    { id: 'q4km',   name: 'Q4_K_M — 4-bit (default)',  bpw: 4.9  },
    { id: 'q3km',   name: 'Q3_K_M — 3-bit',            bpw: 3.9  },
    { id: 'mxfp4',  name: 'MXFP4 — 4-bit native',      bpw: 4.25 }
  ];

  function opts(list, sel) {
    return list.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + x.name + '</option>';
    }).join('');
  }

  function fmt(n, dp) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  document.querySelectorAll('[data-calc]').forEach(function (root) {
    var defMachine = root.dataset.machine || 'm1max64';
    var defModel   = root.dataset.model   || 'l70b';
    var defQuant   = root.dataset.quant   || 'q4km';

    root.classList.add('calc');
    root.innerHTML =
      '<header>' +
        '<span class="tag">Napkin math</span>' +
        '<p class="sub">Change anything. Watch which lever actually moves the number.</p>' +
      '</header>' +
      '<div class="controls">' +
        '<div class="field"><label>Machine</label><select data-f="machine">' + opts(MACHINES, defMachine) + '</select></div>' +
        '<div class="field"><label>Model</label><select data-f="model">' + opts(MODELS, defModel) + '</select></div>' +
        '<div class="field"><label>Quantization</label><select data-f="quant">' + opts(QUANTS, defQuant) + '</select></div>' +
        '<div class="field"><label>Efficiency factor</label><div class="range-row">' +
          '<input type="range" data-f="eff" min="40" max="95" step="1" value="70">' +
          '<span class="range-val" data-o="effv">70%</span></div></div>' +
        '<div class="field custom-machine" hidden><label>Bandwidth (GB/s)</label><input type="number" data-f="bw" value="400" min="1" step="1"></div>' +
        '<div class="field custom-machine" hidden><label>Usable memory (GB)</label><input type="number" data-f="mem" value="48" min="1" step="1"></div>' +
        '<div class="field custom-model" hidden><label>Total params (B)</label><input type="number" data-f="total" value="70.6" min="0.1" step="0.1"></div>' +
        '<div class="field custom-model" hidden><label>Active params (B)</label><input type="number" data-f="active" value="70.6" min="0.1" step="0.1"></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="chain">' +
          '<div><span class="op">bytes read per token =</span> <span class="v" data-o="active"></span> B params <span class="op">x</span> <span class="v" data-o="bpw"></span> bits <span class="op">/ 8 =</span> <span class="v" data-o="bpt"></span> GB</div>' +
          '<div><span class="op">ceiling =</span> <span class="v" data-o="bw"></span> GB/s <span class="op">/</span> <span class="v" data-o="bpt2"></span> GB <span class="op">=</span> <span class="v" data-o="ceiling"></span> tok/s</div>' +
          '<div><span class="op">realistic =</span> ceiling <span class="op">x</span> <span class="v" data-o="eff2"></span> <span class="op">=</span></div>' +
        '</div>' +
        '<div class="headline"><span class="big" data-o="real"></span><span class="unit">tokens / second, single stream</span></div>' +
        '<div class="fit" data-o="fit"></div>' +
      '</div>' +
      '<footer>Weights only — the KV cache adds more memory traffic as context grows, and is not modelled here. Efficiency factor covers the gap between peak and achieved bandwidth: llama.cpp typically lands at 58–82% of theoretical peak.</footer>';

    var el = {};
    root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    var out = {};
    root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

    function syncCustomVisibility() {
      var mCustom = el.machine.value === 'custom';
      var dCustom = el.model.value === 'custom';
      root.querySelectorAll('.custom-machine').forEach(function (n) { n.hidden = !mCustom; });
      root.querySelectorAll('.custom-model').forEach(function (n) { n.hidden = !dCustom; });
    }

    function compute() {
      var machine = byId(MACHINES, el.machine.value);
      var model   = byId(MODELS, el.model.value);
      var quant   = byId(QUANTS, el.quant.value);

      var bw  = el.machine.value === 'custom' ? parseFloat(el.bw.value)  : machine.bw;
      var mem = el.machine.value === 'custom' ? parseFloat(el.mem.value) : machine.mem;
      var total  = el.model.value === 'custom' ? parseFloat(el.total.value)  : model.total;
      var active = el.model.value === 'custom' ? parseFloat(el.active.value) : model.active;
      var bpw = quant.bpw;
      var eff = parseInt(el.eff.value, 10) / 100;

      var bytesPerToken = active * bpw / 8;      // billions of bytes == GB (decimal)
      var footprint     = total  * bpw / 8;      // GB the weights occupy in memory
      var ceiling = bw / bytesPerToken;
      var real    = ceiling * eff;

      out.active.textContent  = fmt(active, 1);
      out.bpw.textContent     = fmt(bpw, 2);
      out.bpt.textContent     = fmt(bytesPerToken, 2);
      out.bpt2.textContent    = fmt(bytesPerToken, 2);
      out.bw.textContent      = fmt(bw, 0);
      out.ceiling.textContent = fmt(ceiling, 1);
      out.eff2.textContent    = fmt(eff, 2);
      out.effv.textContent    = el.eff.value + '%';
      out.real.textContent    = real >= 10 ? fmt(real, 0) : fmt(real, 1);

      var headroom = mem - footprint;
      var f = out.fit;
      f.classList.remove('ok', 'tight', 'no');
      if (footprint > mem) {
        f.classList.add('no');
        f.textContent = 'Does not fit. Weights need ' + fmt(footprint, 1) + ' GB, the machine offers ~' +
          fmt(mem, 0) + ' GB. Spilling to disk drops throughput by roughly an order of magnitude — the number above stops meaning anything.';
      } else if (headroom < footprint * 0.15) {
        f.classList.add('tight');
        f.textContent = 'Tight. Weights need ' + fmt(footprint, 1) + ' GB of ~' + fmt(mem, 0) +
          ' GB, leaving ' + fmt(headroom, 1) + ' GB for the KV cache and everything else. Long contexts will not survive this.';
      } else {
        f.classList.add('ok');
        f.textContent = 'Fits. Weights need ' + fmt(footprint, 1) + ' GB of ~' + fmt(mem, 0) +
          ' GB, leaving ' + fmt(headroom, 1) + ' GB for the KV cache and the rest of the system.';
      }
    }

    root.addEventListener('input', function () { syncCustomVisibility(); compute(); });
    root.addEventListener('change', function () { syncCustomVisibility(); compute(); });
    syncCustomVisibility();
    compute();
  });
})();
