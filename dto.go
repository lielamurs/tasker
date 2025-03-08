package main

type (
	UsernameSetRequest struct {
		ClientID string `json:"clientId"`
		Username string `json:"username"`
	}

	UsernameSetResponse struct {
		Success  bool      `json:"success"`
		Username string    `json:"username"`
		TaskList *TaskList `json:"taskList,omitempty"`
	}

	TaskListCreateRequest struct {
		ClientID string `json:"clientId"`
		Title    string `json:"title"`
	}

	TaskListGetRequest struct {
		ClientID   string `json:"clientId"`
		TaskListID string `json:"taskListId"`
	}

	TaskListResponse struct {
		TaskList *TaskList `json:"taskList"`
		Tasks    []*Task   `json:"tasks"`
		IsOwner  bool      `json:"isOwner"`
	}

	ToggleTaskListLockRequest struct {
		ClientID   string `json:"clientId"`
		TaskListID string `json:"taskListId"`
	}

	CreateTaskRequest struct {
		ClientID    string  `json:"clientId"`
		TaskListID  string  `json:"taskListId"`
		Title       string  `json:"title"`
		Description string  `json:"description"`
		ParentID    *string `json:"parentId,omitempty"`
	}

	UpdateTaskRequest struct {
		ClientID    string  `json:"clientId"`
		TaskID      string  `json:"taskId"`
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Completed   bool    `json:"completed"`
		ParentID    *string `json:"parentId,omitempty"`
	}

	DeleteTaskRequest struct {
		ClientID string `json:"clientId"`
		TaskID   string `json:"taskId"`
	}
)
