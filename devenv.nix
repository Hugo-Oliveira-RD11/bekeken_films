{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  packages = with pkgs;[
  ];

  # https://devenv.sh/languages/
  languages ={
    javascript = {
      enable = true;
      lsp.enable = true;
      corepack.enable = true;
    };
    typescript = {
      enable = true;
      lsp.enable = true;
    };
  };

}
