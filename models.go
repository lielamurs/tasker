package main

import (
	"encoding/json"
	"time"
)

type (
	Task struct {
		ID          string    `json:"id"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		Completed   bool      `json:"completed"`
		CreatedAt   time.Time `json:"createdAt"`
		UpdatedAt   time.Time `json:"updatedAt"`
		SubTasks    []Task    `json:"subTasks"`
	}

	Message struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
)
