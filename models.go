package main

import (
	"encoding/json"
	"time"
)

type (
	Task struct {
		ID          string    `json:"id"`
		TaskListID  string    `json:"taskListId"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		Completed   bool      `json:"completed"`
		CreatedAt   time.Time `json:"createdAt"`
		UpdatedAt   time.Time `json:"updatedAt"`
		ParentID    *string   `json:"parentId,omitempty"`
	}

	Message struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}

	ClientMessage struct {
		Type     string          `json:"type"`
		ClientID string          `json:"clientId"`
		Data     json.RawMessage `json:"data"`
	}

	User struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}

	TaskList struct {
		ID        string    `json:"id"`
		OwnerID   string    `json:"ownerId"`
		OwnerName string    `json:"ownerName"`
		Title     string    `json:"title"`
		IsLocked  bool      `json:"isLocked"`
		CreatedAt time.Time `json:"createdAt"`
		UpdatedAt time.Time `json:"updatedAt"`
	}

	ErrorMessage struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
)
