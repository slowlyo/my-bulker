package sql_parse

import (
	"reflect"
	"testing"
)

func TestDetectResultHeaders(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		expects []string
	}{
		{
			name:    "simple select",
			input:   "SELECT a, b, c FROM t;",
			expects: []string{"a", "b", "c"},
		},
		{
			name:    "select with as and quotes",
			input:   "SELECT a as x, `b`, 'c' as y FROM t;",
			expects: []string{"x", "b", "y"},
		},
		{
			name:    "select with table prefix",
			input:   "SELECT t.a, t2.b FROM t;",
			expects: []string{"t.a", "t2.b"},
		},
		{
			name:    "show columns",
			input:   "SHOW COLUMNS FROM t;",
			expects: []string{"Field", "Type", "Null", "Key", "Default", "Extra"},
		},
		{
			name:    "explain sql",
			input:   "EXPLAIN SELECT * FROM t;",
			expects: []string{"id", "select_type", "table", "partitions", "type", "possible_keys", "key", "key_len", "ref", "rows", "filtered", "Extra"},
		},
		{
			name:    "desc table",
			input:   "DESC t;",
			expects: []string{"Field", "Type", "Null", "Key", "Default", "Extra"},
		},
		{
			name:    "describe table",
			input:   "DESCRIBE t;",
			expects: []string{"Field", "Type", "Null", "Key", "Default", "Extra"},
		},
		{
			name:    "other sql",
			input:   "UPDATE t SET a=1;",
			expects: []string{"result"},
		},
		{
			name:    "select with join",
			input:   "SELECT a.id, b.name FROM a JOIN b ON a.bid = b.id;",
			expects: []string{"a.id", "b.`name`"},
		},
		{
			name:    "select with group by",
			input:   "SELECT dept, COUNT(*) as cnt FROM emp GROUP BY dept;",
			expects: []string{"dept", "cnt"},
		},
		{
			name:    "select with aggregate functions",
			input:   "SELECT SUM(salary) AS total, AVG(age) FROM emp;",
			expects: []string{"total", "avg(age)"},
		},
		{
			name:    "select with subquery",
			input:   "SELECT id, (SELECT MAX(score) FROM t2) as max_score FROM t1;",
			expects: []string{"id", "max_score"},
		},
		{
			name:    "select star",
			input:   "SELECT * FROM t;",
			expects: []string{"*"},
		},
		{
			name:    "select constant",
			input:   "SELECT 1, 'abc', true FROM dual;",
			expects: []string{"1", "abc", "true"},
		},
		{
			name:    "select expression",
			input:   "SELECT a+b as sum, c*d FROM t;",
			expects: []string{"sum", "c * d"},
		},
		{
			name:    "select with function",
			input:   "SELECT IF(a>0, 'yes', 'no') as flag, NOW() FROM t;",
			expects: []string{"flag", "now()"},
		},
		{
			name:    "select with mixed alias and no alias",
			input:   "SELECT a as x, b, c+d as sum FROM t;",
			expects: []string{"x", "b", "sum"},
		},
		{
			name:    "select with quoted alias",
			input:   "SELECT a as `字段A`, b as '字段B' FROM t;",
			expects: []string{"`字段A`", "'字段B'"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DetectResultHeaders(tt.input)
			if !reflect.DeepEqual(got, tt.expects) {
				t.Errorf("got = %#v, expects = %#v", got, tt.expects)
			}
		})
	}
}
