package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

type Server struct {
	clients    map[string]*Client
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client

	taskLists     map[string]*TaskList
	tasks         map[string]*Task
	taskListTasks map[string]map[string]bool
	taskMutex     sync.RWMutex
}

func NewServer() *Server {
	return &Server{
		broadcast:     make(chan []byte),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		clients:       make(map[string]*Client),
		taskLists:     make(map[string]*TaskList),
		tasks:         make(map[string]*Task),
		taskListTasks: make(map[string]map[string]bool),
	}
}

func (s *Server) Run() {
	for {
		select {
		case client := <-s.register:
			s.clients[client.id] = client

		case client := <-s.unregister:
			if _, ok := s.clients[client.id]; ok {
				delete(s.clients, client.id)
				close(client.send)
			}

		case message := <-s.broadcast:
			s.processMessage(message)
		}
	}
}

func (s *Server) processMessage(message []byte) {
	var baseMsg ClientMessage
	if err := json.Unmarshal(message, &baseMsg); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		return
	}

	clientID := baseMsg.ClientID

	switch baseMsg.Type {
	case "set_username":
		var req UsernameSetRequest
		if err := json.Unmarshal(baseMsg.Data, &req); err != nil {
			log.Printf("Error unmarshaling set username request: %v", err)
			return
		}
		req.ClientID = clientID
		s.handleSetUsername(req)

	case "create_task_list":
		var req TaskListCreateRequest
		if err := json.Unmarshal(baseMsg.Data, &req); err != nil {
			log.Printf("Error unmarshaling create task list request: %v", err)
			return
		}
		req.ClientID = clientID
		s.handleCreateTaskList(req)

	case "get_task_list":
		var req TaskListGetRequest
		if err := json.Unmarshal(baseMsg.Data, &req); err != nil {
			log.Printf("Error unmarshaling get task list request: %v", err)
			return
		}
		req.ClientID = clientID
		s.handleGetTaskList(req)

	case "toggle_lock_task_list":
		var req ToggleTaskListLockRequest
		if err := json.Unmarshal(baseMsg.Data, &req); err != nil {
			log.Printf("Error unmarshaling toggle lock request: %v", err)
			return
		}
		req.ClientID = clientID
		s.handleToggleLockTaskList(req)

	case "create_task":
		var req CreateTaskRequest
		if err := json.Unmarshal(baseMsg.Data, &req); err != nil {
			log.Printf("Error unmarshaling create task request: %v", err)
			return
		}
		req.ClientID = clientID
		s.handleCreateTask(req)

	case "update_task":
		var req UpdateTaskRequest
		if err := json.Unmarshal(baseMsg.Data, &req); err != nil {
			log.Printf("Error unmarshaling update task request: %v", err)
			return
		}
		req.ClientID = clientID
		s.handleUpdateTask(req)

	case "delete_task":
		var req DeleteTaskRequest
		if err := json.Unmarshal(baseMsg.Data, &req); err != nil {
			log.Printf("Error unmarshaling delete task request: %v", err)
			return
		}
		req.ClientID = clientID
		s.handleDeleteTask(req)
	}
}

func (s *Server) handleSetUsername(req UsernameSetRequest) {
	s.taskMutex.Lock()
	client, exists := s.clients[req.ClientID]
	if !exists {
		s.taskMutex.Unlock()
		log.Printf("Client not found: %s", req.ClientID)
		return
	}

	client.username = req.Username
	log.Printf("Set username for client %s: %s", req.ClientID, req.Username)

	var userTaskList *TaskList = nil
	for _, taskList := range s.taskLists {
		if taskList.OwnerID == req.ClientID {
			userTaskList = taskList
			log.Printf("Found existing task list %s for client %s", taskList.ID, req.ClientID)
			break
		}
	}
	s.taskMutex.Unlock()

	resp := UsernameSetResponse{
		Success:  true,
		Username: req.Username,
		TaskList: userTaskList,
	}

	respData, err := json.Marshal(resp)
	if err != nil {
		log.Printf("Error marshaling response: %v", err)
		return
	}

	msg := Message{
		Type: "username_set",
		Data: respData,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	client.send <- msgBytes

	if userTaskList != nil {
		s.sendTasksForTaskList(client, userTaskList)
	}
}

func (s *Server) sendTasksForTaskList(client *Client, taskList *TaskList) {
	s.taskMutex.RLock()
	defer s.taskMutex.RUnlock()

	tasks := make([]*Task, 0)
	for taskID := range s.taskListTasks[taskList.ID] {
		if task, ok := s.tasks[taskID]; ok {
			tasks = append(tasks, task)
		}
	}

	isOwner := taskList.OwnerID == client.id
	resp := TaskListResponse{
		TaskList: taskList,
		Tasks:    tasks,
		IsOwner:  isOwner,
	}

	respData, err := json.Marshal(resp)
	if err != nil {
		log.Printf("Error marshaling task list data: %v", err)
		return
	}

	// Send the task list data message
	msg := Message{
		Type: "task_list_data",
		Data: respData,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	log.Printf("Sending task list data to client %s for task list %s with %d tasks", client.id, taskList.ID, len(tasks))
	client.send <- msgBytes
}

func (s *Server) handleCreateTaskList(req TaskListCreateRequest) {
	s.taskMutex.RLock()
	client, exists := s.clients[req.ClientID]
	if !exists {
		s.taskMutex.RUnlock()
		log.Printf("Client not found: %s", req.ClientID)
		return
	}

	if client.username == "" {
		s.taskMutex.RUnlock()
		sendError(client, "USERNAME_REQUIRED", "You must set a username before creating a task list")
		return
	}

	hasTaskList := false
	for _, taskList := range s.taskLists {
		if taskList.OwnerID == req.ClientID {
			hasTaskList = true
			break
		}
	}
	s.taskMutex.RUnlock()

	if hasTaskList {
		sendError(client, "TASK_LIST_EXISTS", "You already have a task list")
		return
	}

	taskListID := generateID()
	taskList := &TaskList{
		ID:        taskListID,
		OwnerID:   req.ClientID,
		OwnerName: client.username,
		Title:     req.Title,
		IsLocked:  false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	s.taskMutex.Lock()
	s.taskLists[taskListID] = taskList
	s.taskListTasks[taskListID] = make(map[string]bool)
	s.taskMutex.Unlock()

	respData, err := json.Marshal(taskList)
	if err != nil {
		log.Printf("Error marshaling task list: %v", err)
		return
	}

	msg := Message{
		Type: "task_list_created",
		Data: respData,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	client.send <- msgBytes
}

func (s *Server) handleGetTaskList(req TaskListGetRequest) {
	s.taskMutex.RLock()
	client, exists := s.clients[req.ClientID]
	if !exists {
		s.taskMutex.RUnlock()
		log.Printf("Client not found: %s", req.ClientID)
		return
	}

	taskList, exists := s.taskLists[req.TaskListID]
	if !exists {
		s.taskMutex.RUnlock()
		log.Printf("Task list not found: %s", req.TaskListID)
		sendError(client, "TASK_LIST_NOT_FOUND", "Task list not found")
		return
	}

	tasks := make([]*Task, 0)
	for taskID := range s.taskListTasks[req.TaskListID] {
		if task, ok := s.tasks[taskID]; ok {
			tasks = append(tasks, task)
		}
	}

	isOwner := taskList.OwnerID == req.ClientID
	s.taskMutex.RUnlock()

	log.Printf("Client %s (%s) retrieved task list %s with %d tasks (owner: %v)",
		req.ClientID, client.username, req.TaskListID, len(tasks), isOwner)

	resp := TaskListResponse{
		TaskList: taskList,
		Tasks:    tasks,
		IsOwner:  isOwner,
	}

	respData, err := json.Marshal(resp)
	if err != nil {
		log.Printf("Error marshaling response: %v", err)
		return
	}

	msg := Message{
		Type: "task_list_data",
		Data: respData,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	client.send <- msgBytes
}

func (s *Server) handleToggleLockTaskList(req ToggleTaskListLockRequest) {
	s.taskMutex.Lock()
	defer s.taskMutex.Unlock()

	client, exists := s.clients[req.ClientID]
	if !exists {
		log.Printf("Client not found: %s", req.ClientID)
		return
	}

	taskList, exists := s.taskLists[req.TaskListID]
	if !exists {
		sendError(client, "TASK_LIST_NOT_FOUND", "Task list not found")
		return
	}

	if taskList.OwnerID != req.ClientID {
		sendError(client, "NOT_AUTHORIZED", "Only the owner can lock or unlock the task list")
		return
	}

	taskList.IsLocked = !taskList.IsLocked
	taskList.UpdatedAt = time.Now()
	s.broadcastTaskListUpdate(taskList)
}

func (s *Server) handleCreateTask(req CreateTaskRequest) {
	s.taskMutex.Lock()
	defer s.taskMutex.Unlock()

	client, exists := s.clients[req.ClientID]
	if !exists {
		log.Printf("Client not found: %s", req.ClientID)
		return
	}

	taskList, exists := s.taskLists[req.TaskListID]
	if !exists {
		sendError(client, "TASK_LIST_NOT_FOUND", "Task list not found")
		return
	}

	if taskList.IsLocked && taskList.OwnerID != req.ClientID {
		sendError(client, "TASK_LIST_LOCKED", "This task list is locked by the owner")
		return
	}

	taskID := generateID()
	task := &Task{
		ID:          taskID,
		TaskListID:  req.TaskListID,
		Title:       req.Title,
		Description: req.Description,
		Completed:   false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		ParentID:    req.ParentID,
	}

	s.tasks[taskID] = task
	s.taskListTasks[req.TaskListID][taskID] = true
	s.broadcastTaskCreated(task)
}

func (s *Server) handleUpdateTask(req UpdateTaskRequest) {
	s.taskMutex.Lock()
	defer s.taskMutex.Unlock()

	client, exists := s.clients[req.ClientID]
	if !exists {
		log.Printf("Client not found: %s", req.ClientID)
		return
	}

	task, exists := s.tasks[req.TaskID]
	if !exists {
		sendError(client, "TASK_NOT_FOUND", "Task not found")
		return
	}

	taskList, exists := s.taskLists[task.TaskListID]
	if !exists {
		sendError(client, "TASK_LIST_NOT_FOUND", "Task list not found")
		return
	}

	if taskList.IsLocked && taskList.OwnerID != req.ClientID {
		sendError(client, "TASK_LIST_LOCKED", "This task list is locked by the owner")
		return
	}

	task.Title = req.Title
	task.Description = req.Description
	task.Completed = req.Completed
	task.ParentID = req.ParentID
	task.UpdatedAt = time.Now()
	s.broadcastTaskUpdated(task)
}

func (s *Server) handleDeleteTask(req DeleteTaskRequest) {
	s.taskMutex.Lock()
	defer s.taskMutex.Unlock()

	client, exists := s.clients[req.ClientID]
	if !exists {
		log.Printf("Client not found: %s", req.ClientID)
		return
	}

	task, exists := s.tasks[req.TaskID]
	if !exists {
		sendError(client, "TASK_NOT_FOUND", "Task not found")
		return
	}

	taskList, exists := s.taskLists[task.TaskListID]
	if !exists {
		sendError(client, "TASK_LIST_NOT_FOUND", "Task list not found")
		return
	}

	if taskList.IsLocked && taskList.OwnerID != req.ClientID {
		sendError(client, "TASK_LIST_LOCKED", "This task list is locked by the owner")
		return
	}

	taskListID := task.TaskListID
	delete(s.tasks, req.TaskID)
	delete(s.taskListTasks[taskListID], req.TaskID)

	for otherTaskID, otherTask := range s.tasks {
		if otherTask.ParentID != nil && *otherTask.ParentID == req.TaskID {
			delete(s.tasks, otherTaskID)
			delete(s.taskListTasks[taskListID], otherTaskID)
		}
	}
	s.broadcastTaskDeleted(req.TaskID, taskListID)
}

func (s *Server) broadcastMsg(messageType string, data any) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling %s data: %v", messageType, err)
		return
	}

	msg := Message{
		Type: messageType,
		Data: dataBytes,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling %s message: %v", messageType, err)
		return
	}

	for clientID, client := range s.clients {
		select {
		case client.send <- msgBytes:
		default:
			close(client.send)
			delete(s.clients, clientID)
		}
	}
}

func (s *Server) broadcastTaskListUpdate(taskList *TaskList) {
	s.broadcastMsg("task_list_updated", taskList)
}

func (s *Server) broadcastTaskCreated(task *Task) {
	s.broadcastMsg("task_created", task)
}

func (s *Server) broadcastTaskUpdated(task *Task) {
	s.broadcastMsg("task_updated", task)
}

func (s *Server) broadcastTaskDeleted(taskID string, taskListID string) {
	data := struct {
		TaskID     string `json:"taskId"`
		TaskListID string `json:"taskListId"`
	}{
		TaskID:     taskID,
		TaskListID: taskListID,
	}
	s.broadcastMsg("task_deleted", data)
}

func sendError(client *Client, code string, message string) {
	errMsg := ErrorMessage{
		Code:    code,
		Message: message,
	}

	errData, err := json.Marshal(errMsg)
	if err != nil {
		log.Printf("Error marshaling error message: %v", err)
		return
	}

	msg := Message{
		Type: "error",
		Data: errData,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	client.send <- msgBytes
}

func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
