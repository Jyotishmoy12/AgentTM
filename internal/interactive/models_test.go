package interactive

import (
	"context"
	"os"
	"testing"
)

func TestModelCatalogFiltersHiddenAndNonTextModels(t *testing.T) {
	t.Setenv("AGENTTM_APP_SERVER_TEST", "1")
	models, err := ListModels(context.Background(), os.Args[0], t.TempDir())
	if err != nil || len(models) != 1 || models[0].Model != "synthetic-model" || !models[0].IsDefault {
		t.Fatalf("%+v %v", models, err)
	}
}
