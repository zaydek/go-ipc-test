package retro

const (
	// Permission bits for writing files
	permFile = 0644

	// Permission bits for writing directories
	permDir = 0755
)

////////////////////////////////////////////////////////////////////////////////

type CommandMode = string

const (
	ModeDev   CommandMode = "dev"
	ModeBuild CommandMode = "build"
)
