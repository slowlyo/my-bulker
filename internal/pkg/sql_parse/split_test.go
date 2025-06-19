package sql_parse

import (
	"reflect"
	"testing"
)

func TestSplitSQLStatements(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		expects []string
		wantErr bool
	}{
		{
			name:    "simple multiple statements",
			input:   "SELECT 1; SELECT 2;",
			expects: []string{"SELECT 1", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "trailing semicolon",
			input:   "SELECT 1;",
			expects: []string{"SELECT 1"},
			wantErr: false,
		},
		{
			name:    "no semicolon",
			input:   "SELECT 1",
			expects: []string{"SELECT 1"},
			wantErr: false,
		},
		{
			name:    "empty input",
			input:   " ",
			expects: nil,
			wantErr: true,
		},
		{
			name:    "semicolon in string",
			input:   "INSERT INTO t VALUES ('a;b'); SELECT 2;",
			expects: []string{"INSERT INTO t VALUES ('a;b')", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "single line comment",
			input:   "SELECT 1; -- comment\nSELECT 2;",
			expects: []string{"SELECT 1", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "multi line comment",
			input:   "SELECT 1; /* comment */ SELECT 2;",
			expects: []string{"SELECT 1", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "complex string with escaped quote",
			input:   "INSERT INTO t VALUES ('a\\';b'); SELECT 2;",
			expects: []string{"INSERT INTO t VALUES ('a\\';b')", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "multiple semicolons and empty statements",
			input:   ";;SELECT 1;;;SELECT 2;;",
			expects: []string{"SELECT 1", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "semicolon in multiline string",
			input:   "INSERT INTO t VALUES ('a;\nb'); SELECT 2;",
			expects: []string{"INSERT INTO t VALUES ('a;\nb')", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "double quoted string with semicolon",
			input:   "INSERT INTO t VALUES (\"a;b\"); SELECT 2;",
			expects: []string{"INSERT INTO t VALUES (\"a;b\")", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "comment with semicolon",
			input:   "SELECT 1; -- comment;\nSELECT 2; /* multi;line;comment */ SELECT 3;",
			expects: []string{"SELECT 1", "SELECT 2", "SELECT 3"},
			wantErr: false,
		},
		{
			name:    "nested comments (should remove all)",
			input:   "SELECT 1; /* outer /* inner */ still comment */ SELECT 2;",
			expects: []string{"SELECT 1", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "string with comment-like content",
			input:   "SELECT '--notacomment'; SELECT '/*notacomment*/';",
			expects: []string{"SELECT '--notacomment'", "SELECT '/*notacomment*/'"},
			wantErr: false,
		},
		{
			name:    "escaped quote in double quoted string",
			input:   "INSERT INTO t VALUES (\"a\\\"b\"); SELECT 2;",
			expects: []string{"INSERT INTO t VALUES (\"a\\\"b\")", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "string with newline and semicolon",
			input:   "INSERT INTO t VALUES ('a\n;b'); SELECT 2;",
			expects: []string{"INSERT INTO t VALUES ('a\n;b')", "SELECT 2"},
			wantErr: false,
		},
		{
			name:    "only comments",
			input:   "-- only comment\n/* block comment */",
			expects: nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := SplitSQLStatements(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
			}
			if !reflect.DeepEqual(got, tt.expects) {
				t.Errorf("got = %#v, expects = %#v", got, tt.expects)
			}
		})
	}
}
