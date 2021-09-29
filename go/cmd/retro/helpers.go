package retro

import "strings"

func splitMulitlineBrackets(str string) string {
	var ret string
	splits := strings.Split(str, "><")
	for splitIndex, split := range splits {
		if splitIndex > 0 {
			// Add the beginning brace
			ret += "\t\t<"
		}
		ret += split
		if splitIndex+1 < len(splits) {
			// Add the end brace
			ret += ">\n"
		}
	}
	return ret
}
