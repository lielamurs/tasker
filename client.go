package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections for development
	},
}

type Client struct {
	server   *Server
	conn     *websocket.Conn
	send     chan []byte
	id       string
	username string
}

func ServeWs(server *Server, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	clientID := r.URL.Query().Get("clientId")
	if clientID == "" {
		log.Println("Client ID is required")
		conn.Close()
		return
	}

	log.Printf("Client connected/reconnected with ID: %s", clientID)

	var username string
	server.taskMutex.RLock()
	for _, cl := range server.clients {
		if cl.id == clientID && cl.username != "" {
			username = cl.username
			log.Printf("Reconnected client %s has username: %s", clientID, username)
			break
		}
	}
	server.taskMutex.RUnlock()

	client := &Client{
		server:   server,
		conn:     conn,
		send:     make(chan []byte, 256),
		id:       clientID,
		username: username,
	}

	client.server.register <- client

	go client.readService()
	go client.writeService()

	if username != "" {
		fakeSetUsernameReq := UsernameSetRequest{
			ClientID: clientID,
			Username: username,
		}

		go func() {
			time.Sleep(100 * time.Millisecond)
			server.handleSetUsername(fakeSetUsernameReq)
		}()
	}
}

func (c *Client) readService() {
	defer func() {
		c.server.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, rawMessage, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		rawMessage = bytes.TrimSpace(bytes.Replace(rawMessage, newline, space, -1))
		var clientMsg Message
		if err := json.Unmarshal(rawMessage, &clientMsg); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		baseMsg := ClientMessage{
			Type:     clientMsg.Type,
			ClientID: c.id,
			Data:     clientMsg.Data,
		}

		message, err := json.Marshal(baseMsg)
		if err != nil {
			log.Printf("Error creating message: %v", err)
			continue
		}
		c.server.broadcast <- message
	}
}

func (c *Client) writeService() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			pendingMessages := make([][]byte, 0, len(c.send))
			for range len(c.send) {
				pendingMessages = append(pendingMessages, <-c.send)
			}

			for _, msg := range pendingMessages {
				w.Write(newline)
				w.Write(msg)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
