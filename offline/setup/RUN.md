# Offline setup — copy-paste sequence (macOS, no agent needed)

Everything builds from source into `offline/`. Homebrew is not required.
Run in order from the workspace root; each script is idempotent, so re-run after a failure.

```sh
xcode-select --install          # once, if `xcode-select -p` fails

./offline/setup/00-toolchain.sh # machine profile + cmake + node   (~3 min)
./offline/setup/01-llama-cpp.sh # clone + Metal build              (~5 min)
./offline/setup/02-pi.sh        # clone + npm build + ~/.local/bin/pi (~5 min)
./offline/setup/03-models.sh    # configs, GGUF weights, llama-bench baseline (long)
./offline/setup/04-docs.sh      # TypeBox, DevDocs, archived sources (~10 min)

# then turn Wi-Fi off:
./offline/setup/05-verify.sh
```

## Notes

- **00** writes `offline/MACHINE.md` and sets `PROFILE=SMALL` (8 GB M1) or `LARGE` (48 GB M4)
  from installed RAM. Every later script reads it. It records GPU core count too —
  16/20 = M4 Pro 273 GB/s, 40 = M4 Max 546 GB/s, worth 2x in decode speed.
- **03** asks before the 21.7 GB Ornith on the corporate machine. Skip the prompt with
  `BIG=1` (take it), `BIG=fallback` (16 GB Qwen3.8-27B instead), or answer `N` and run the
  lessons on the 4B. Downloads resume (`curl -C -`), so an interrupted pull is safe to re-run.
- **04** uses `monolith` if `cargo` is present, else plain `curl`. Anything under 10 KB it
  reports is an error page, not an article — re-fetch those by hand.
- `offline/` is portable between the two machines **except `offline/models/`**. Copy the rest
  across rather than re-downloading.
- Point pi at the local server: `offline/repos/llama.cpp/build/bin/llama-server -m <gguf> -c 8192`,
  then `pi` → `/login llama.cpp`. Details in `offline/repos/pi/packages/coding-agent/docs/llama-cpp.md`.

Neovim on the M4 is separate and unchanged — `NVIM.md`, and it needs none of this.
