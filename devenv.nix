{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  packages = with pkgs;[
    cmake
    ninja
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
      lsp.package = pkgs.typescript-language-server;
    };
  };

  android = {
    enable = true;
    reactNative.enable = true;
    platforms.version = [ "36" "37" ];
    buildTools.version = [ "36.0.0" "37.0.0" ];
    ndk.enable = true;
    ndk.version = [ "27.1.12297006" ];
  };
}
