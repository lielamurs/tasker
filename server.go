package main

import (
	"encoding/json"
	"log"
	"sync"
)

type Server struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client

	// Current state of tasks
	tasks      map[string]Task
	tasksMutex sync.RWMutex
}

func NewServer() *Server {
	return &Server{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		tasks:      make(map[string]Task),
	}
}

func (s *Server) Run() {
	for {
		select {
		case client := <-s.register:
			s.clients[client] = true
			s.sendCurrentState(client)

		case client := <-s.unregister:
			if _, ok := s.clients[client]; ok {
				delete(s.clients, client)
				close(client.send)
			}

		case message := <-s.broadcast:
			s.processMessage(message)
			for client := range s.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(s.clients, client)
				}
			}
		}
	}
}

func (s *Server) processMessage(message []byte) {
	var msg Message
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		return
	}

	s.tasksMutex.Lock()
	defer s.tasksMutex.Unlock()

	switch msg.Type {
	case "create_task":
		var task Task
		if err := json.Unmarshal(msg.Data, &task); err != nil {
			log.Printf("Error unmarshaling task: %v", err)
			return
		}
		s.tasksMutex.Lock()
		s.tasks[task.ID] = task
		s.tasksMutex.Unlock()

	case "update_task":
		var task Task
		if err := json.Unmarshal(msg.Data, &task); err != nil {
			log.Printf("Error unmarshaling task: %v", err)
			return
		}
		s.tasksMutex.Lock()
		s.tasks[task.ID] = task
		s.tasksMutex.Unlock()

	case "delete_task":
		var taskID string
		if err := json.Unmarshal(msg.Data, &taskID); err != nil {
			log.Printf("Error unmarshaling task ID: %v", err)
			return
		}
		s.tasksMutex.Lock()
		delete(s.tasks, taskID)
		s.tasksMutex.Unlock()
	}
}

func (s *Server) sendCurrentState(client *Client) {
	s.tasksMutex.RLock()

	// Convert map to slice for the client
	tasks := make([]Task, 0, len(s.tasks))
	for _, task := range s.tasks {
		tasks = append(tasks, task)
	}

	s.tasksMutex.RUnlock()

	data, err := json.Marshal(tasks)
	if err != nil {
		log.Printf("Error marshaling tasks: %v", err)
		return
	}

	msg := Message{
		Type: "initial_state",
		Data: json.RawMessage(data),
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	client.send <- msgBytes
}
