package expect

import "testing"

func TestDeepEqual(t *testing.T) {
	DeepEqual(t, "foo", "foo")                     // Primitive
	DeepEqual(t, []string{"foo"}, []string{"foo"}) // Reference
}

func TestNotDeepEqual(t *testing.T) {
	NotDeepEqual(t, "foo", "bar")                     // Primitive
	NotDeepEqual(t, []string{"foo"}, []string{"bar"}) // Reference
}
