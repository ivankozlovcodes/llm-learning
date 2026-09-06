# Neovim on the 48 GB M4

Setting up your own config on the corporate MacBook. Written from the working setup on the Arch
machine (`~/.config/nvim`, Neovim 0.12.5, 42 plugins pinned in `lazy-lock.json`), so the paths and
names below are yours, not generic advice.

**Expect 20 minutes**, most of it waiting on downloads.

---

## What your setup actually is

Two repositories, and it matters which does what:

| Repo | Role |
|---|---|
| **`ivankozlovcodes/lazy-workspaces.nvim`** | The bootstrapper. `init.lua` clones it, it clones everything else. |
| **`ivankozlovcodes/nvim.conf.d`** | The config itself, consumed as a lazy.nvim plugin — not a standalone config. |

`~/.config/nvim/init.lua` is 25 lines and does only three things: set `mapleader` to space, clone
`lazy-workspaces.nvim` into `stdpath("data")` if missing, and call `setup()` with your repo as the
`default` config source on branch `feat/lazy-workspaces`.

Everything else — lazy.nvim itself, all 42 plugins, the `common` / `personal` module split — is
downstream of that one call.

> **`bootstrap.sh` in the repo is the older path.** It writes a plain lazy.nvim `init.lua` and takes
> module names as arguments (`./bootstrap.sh common personal`). It still works, but your current
> machine does not use it, and it refuses to run if `init.lua` already exists. Use the lazy-workspaces
> path below unless you specifically want the old layout.

---

## Step 1 · Prerequisites

```sh
# Homebrew, if the corp image lacks it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install neovim git ripgrep fd
```

`ripgrep` and `fd` are not optional — `snacks.picker` is your file finder, grep, buffer list and
LSP navigation (`<leader>ff`, `<leader>fg`, `gd`, `gr`), and it shells out to both.

Then the formatters `conform.nvim` runs on save, which are external binaries and will fail silently
if absent:

```sh
brew install stylua        # lua
brew install clang-format  # c, cpp
brew install go            # provides gofmt; goimports below
go install golang.org/x/tools/cmd/goimports@latest
```

Skip the Go pair if you will not touch Go on this machine — `format_on_save` falls back to LSP
formatting.

Treesitter compiles parsers locally, so you need a C compiler. On macOS that means Command Line
Tools: `xcode-select --install`. On a corp machine this may already be present, or may need a
ticket.

**Check:** `nvim --version` is 0.11 or newer (your config uses `vim.lsp.config` / `vim.lsp.enable`
and `vim.treesitter.foldexpr`, both of which need 0.11+), and `rg --version` works.

---

## Step 2 · The config

No SSH key required — `lazy-workspaces` fetches over HTTPS, so you do not need your personal key on
a machine you do not own.

```sh
mkdir -p ~/.config/nvim
cat > ~/.config/nvim/init.lua <<'EOF'
vim.g.mapleader = " "
vim.g.maplocalleader = " "

local lwpath = vim.fn.stdpath("data") .. "/lazy/lazy-workspaces.nvim"
if not (vim.uv or vim.loop).fs_stat(lwpath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/ivankozlovcodes/lazy-workspaces.nvim.git",
		lwpath,
	})
end
vim.opt.rtp:prepend(lwpath)

require("lazy-workspaces").setup({
	configs = {
		default = {
			source = "https://github.com/ivankozlovcodes/nvim.conf.d",
			branch = "feat/lazy-workspaces",
		},
	},
	specs = { "plugins", "themes" },
	lazy = {
		dev = { path = "~/git", fallback = true },
		change_detection = { notify = false },
	},
})
EOF

mkdir -p ~/.vim/undodir    # undofile is on; this directory is not auto-created
```

Open `nvim` and wait. Lazy installs all 42 plugins, treesitter compiles its parsers, and Mason
downloads `lua_ls`, `gopls` and `clangd`.

**Check:** `:Lazy` shows plugins installed with no errors, `:Mason` shows three servers installed,
`:checkhealth` is clean apart from optional providers you do not use.

---

## Step 3 · Choose modules

`~/.config/nvim/lazy-workspaces.json` selects which `myconfig` modules load. Yours reads:

```json
{
  "default": {
    "myconfig/common": true,
    "myconfig/goog": false,
    "myconfig/personal": true
  }
}
```

**Leave `myconfig/goog` false.** It pulls `sso://user/fentanes/nvgoog`, an internal remote that
only resolves inside one specific corporate network. If this M4 is *not* that network, enabling it
breaks startup with a clone failure. If it *is*, flip it to `true` and let it load first — it sets
theme defaults the other modules build on.

There is no `work` module in the repo despite the README mentioning one; the directories that exist
are `common`, `personal`, `experimental` and `vscode`. If you want corp-only overrides, create
`lua/myconfig/work/init.lua` with an `M.setup()` and a `plugins/` directory beside it, then add
`"myconfig/work": true` here — `:Install work <author/plugin>` will scaffold plugin specs into it.

---

## Step 4 · macOS differences from the Arch machine

Four things behave differently. None are fatal; two will confuse you at 11pm.

**Clipboard — already handled.** `common/init.lua` only installs the `wl-clipboard` provider when
`vim.env.WAYLAND_DISPLAY` is set, so on macOS it falls through to `clipboard = "unnamedplus"` and
Neovim uses `pbcopy`/`pbpaste`. Nothing to do.

**`<C-,>` will probably not reach Neovim.** Your Claude Code toggle is bound to `<C-,>` in both
normal and terminal mode. Terminals cannot transmit that sequence unless they speak the kitty
keyboard protocol — Ghostty, kitty and WezTerm do; Terminal.app and stock iTerm2 do not. If the
binding is dead, either install Ghostty (`brew install --cask ghostty`) or use `<leader>ac`, which
is bound to the same command and works everywhere.

**Nerd Font.** `blink.cmp` is configured with `nerd_font_variant = "mono"`, and lualine, alpha and
fyler all use glyphs. Install one and set it in the terminal profile:

```sh
brew install --cask font-jetbrains-mono-nerd-font
```

**`~/git` is the dev path.** `dev = { path = "~/git", fallback = true }` means lazy prefers a local
checkout of any plugin found there. On the Arch machine that is why both `~/git/nvim.conf.d` and
`~/.config/nvim` exist and appear identical. On the M4, if you want to *edit* the config rather than
just use it:

```sh
git clone https://github.com/ivankozlovcodes/nvim.conf.d ~/git/nvim.conf.d
```

Lazy will then load your working copy instead of the fetched one, and `<leader>fe` (find config
file) will open the editable version.

---

## Step 5 · Corporate machine gotchas

- **TLS inspection breaks git and Mason.** If clones hang or fail with certificate errors, test
  `curl -sI https://github.com` first. Mason downloads release binaries from GitHub, so it fails the
  same way and reports it less clearly.
- **Mason binaries may be quarantined.** Gatekeeper can block downloaded language servers. If
  `lua_ls` installs but never attaches, check `:LspLog` and then
  `xattr -d com.apple.quarantine <path>`.
- **`format_on_save` has a 500 ms timeout.** On a machine with an aggressive endpoint scanner,
  `clang-format` can exceed it and saves will appear to skip formatting. Raise it in
  `common/plugins/conform.lua` if that happens rather than assuming the config is broken.
- **Keep the config in your own home directory.** Do not put it anywhere synced to a corporate
  file share; `lazy-lock.json` and `undodir` churn constantly.

---

## Step 6 · Verify

```
nvim
```

- `<leader>ff` opens the file picker and finds files — proves `fd` and snacks work.
- `<leader>fg` greps — proves `ripgrep`.
- Open a `.lua` file: syntax is highlighted (treesitter compiled), `gd` jumps (`lua_ls` attached),
  saving reformats (`stylua` on PATH).
- `<leader>?` searches help tags.
- `<leader>ac` opens Claude Code. `<C-,>` too, if your terminal passes it.
- `:Lazy` reports no failed plugins.

---

## Relationship to the rest of this workspace

Neovim is not part of the local-LLM curriculum, but two things connect:

- **`claudecode.nvim` is a harness**, in exactly the sense the lessons use the word. `<leader>as`
  sends a visual selection to it — that selection becomes input tokens, and by
  [Lesson 17](lessons/0017-input-and-output-tokens.html) it is re-sent on every subsequent turn.
  Sending a 600-line file is the ratchet in miniature.
- If you point pi at a local model on this M4 ([Lesson 12's](lessons/0012-multi-model-routing.html)
  addendum), the editor and the model are on the same machine and competing for the same unified
  memory. A 21.71 GB model plus a browser plus Neovim with 42 plugins is still comfortable inside
  36 GB, but it is the same budget — see [reference/three-machines.html](reference/three-machines.html).
