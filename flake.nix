{
  description = "Portfolio dev environment";

  inputs = { nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11"; };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [ nodejs_24 ];

        shellHook = ''
          export Nix_SHELL=npm
            echo "Dev shell loaded"
            echo "Node: $(node -v)"
            echo "npm: $(npm -v)"
        '';
      };
    };
}

