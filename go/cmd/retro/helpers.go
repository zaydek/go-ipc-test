package retro

import "strings"

func formatHTMLHead(str string) string {
	var head string
	splits := strings.Split(str, "><")
	for splitIndex, split := range splits {
		if splitIndex > 0 {
			head += "\t\t<"
		}
		head += split
		if splitIndex+1 < len(splits) {
			head += ">\n"
		}
	}
	return head
}
