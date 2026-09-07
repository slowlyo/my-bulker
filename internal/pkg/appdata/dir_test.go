package appdata

import (
	"path/filepath"
	"testing"
)

func TestIsMacAppBundle(t *testing.T) {
	tests := []struct {
		name string
		dir  string
		want bool
	}{
		{
			name: "macos app bundle",
			dir:  "/Applications/my-bulker-desktop.app/Contents/MacOS",
			want: true,
		},
		{
			name: "portable unix dir",
			dir:  "/opt/my-bulker",
			want: false,
		},
		{
			name: "windows portable dir",
			dir:  `C:\Users\me\Desktop\my-bulker`,
			want: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsMacAppBundle(tt.dir); got != tt.want {
				t.Fatalf("IsMacAppBundle(%q)=%v, want %v", tt.dir, got, tt.want)
			}
		})
	}
}

func TestResolveDesktopRoot(t *testing.T) {
	userConfig := filepath.Join(string(filepath.Separator), "home", "me", ".config")
	exeDir := filepath.Join(string(filepath.Separator), "opt", "my-bulker")

	t.Run("portable writable", func(t *testing.T) {
		got := ResolveDesktopRoot(exeDir, userConfig, false, true)
		if got != exeDir {
			t.Fatalf("got %q, want exe dir %q", got, exeDir)
		}
	})

	t.Run("mac app bundle uses user config", func(t *testing.T) {
		bundle := filepath.Join(string(filepath.Separator), "Applications", "my-bulker-desktop.app", "Contents", "MacOS")
		got := ResolveDesktopRoot(bundle, userConfig, true, false)
		want := filepath.Join(userConfig, "my-bulker")
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})

	t.Run("not writable falls back", func(t *testing.T) {
		got := ResolveDesktopRoot(exeDir, userConfig, false, false)
		want := filepath.Join(userConfig, "my-bulker")
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})
}
