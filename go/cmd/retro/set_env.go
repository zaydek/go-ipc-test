package retro

import (
	"fmt"
	"os"
)

var (
	NODE_ENV      = ""
	RETRO_CMD     = ""
	RETRO_WWW_DIR = ""
	RETRO_SRC_DIR = ""
	RETRO_OUT_DIR = ""
)

// Propagates environmental variables or sets default values
func setEnvsAndGlobalVariables(commandMode CommandMode) error {
	var err error
	setEnv := func(envKey, fallbackValue string) {
		if err != nil {
			return
		}
		envValue := os.Getenv(envKey)
		if envValue == "" {
			envValue = fallbackValue
		}
		switch envKey {
		case "NODE_ENV":
			NODE_ENV = envValue
		case "RETRO_CMD":
			RETRO_CMD = envValue
		case "RETRO_WWW_DIR":
			RETRO_WWW_DIR = envValue
		case "RETRO_SRC_DIR":
			RETRO_SRC_DIR = envValue
		case "RETRO_OUT_DIR":
			RETRO_OUT_DIR = envValue
		}
		if err = os.Setenv(envKey, envValue); err != nil {
			err = fmt.Errorf("os.Setenv: %w", err)
		}
	}
	switch commandMode {
	case ModeDev:
		setEnv("NODE_ENV", "development")
	case ModeBuild:
		setEnv("NODE_ENV", "production")
	}
	switch commandMode {
	case ModeDev:
		setEnv("RETRO_CMD", ModeDev)
	case ModeBuild:
		setEnv("RETRO_CMD", ModeBuild)
	}
	setEnv("RETRO_WWW_DIR", "www")
	setEnv("RETRO_SRC_DIR", "src")
	setEnv("RETRO_OUT_DIR", "out")
	return err
}
