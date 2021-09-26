package expect

import (
	"reflect"
	"testing"
)

func DeepEqual(t *testing.T, x, y interface{}) {
	if reflect.DeepEqual(x, y) {
		// Deeply equal; done
		return
	}

	str1, ok1 := x.(string)
	str2, ok2 := y.(string)
	if ok1 && ok2 {
		t.Fatalf("got %q want %q", str1, str2)
	}
	t.Fatalf("got %+v want %+v", x, y)
}

func NotDeepEqual(t *testing.T, x, y interface{}) {
	if !reflect.DeepEqual(x, y) {
		// Not deeply equal; done
		return
	}

	str1, ok1 := x.(string)
	str2, ok2 := y.(string)
	if ok1 && ok2 {
		t.Fatalf("got %q want %q", str1, str2)
	}
	t.Fatalf("got %+v want %+v", x, y)
}
