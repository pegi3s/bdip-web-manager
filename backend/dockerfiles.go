package main

import (
    "fmt"
    "io"
    "net/http"
	"net/url"
)

const port string = ":8080"

func handleRequest(w http.ResponseWriter, r *http.Request) {
    fmt.Printf("Proxying request to: %s\n", r.URL)

	// Change the request URL to the Docker Hub URL
	newURL, _ := url.Parse("https://hub.docker.com" + r.URL.Path)
    newURL.RawQuery = r.URL.RawQuery
    r.URL = newURL

    // Create a new request to the target server
    req, err := http.NewRequest(r.Method, r.URL.String(), r.Body)
    if err != nil {
        fmt.Printf("Error creating new request: %s\n", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Copy headers from the original request
    req.Header = make(http.Header)
    for k, vv := range r.Header {
        for _, v := range vv {
            req.Header.Add(k, v)
        }
    }

    fmt.Printf("Sending request to target server: %s %s\n", req.Method, req.URL)

    // Send the request to the target server
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        fmt.Printf("Error sending request to target server: %s\n", err)
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()

    fmt.Printf("Received response from target server: %s\n", resp.Status)

    // Add CORS headers to the response
    w.Header().Set("Access-Control-Allow-Origin", "*")

    // Copy response headers to the client
    for k, vv := range resp.Header {
        for _, v := range vv {
            w.Header().Add(k, v)
        }
    }
    w.WriteHeader(resp.StatusCode)

    // Copy response body to the client
    _, err = io.Copy(w, resp.Body)
    if err != nil {
        fmt.Printf("Error copying response body to client: %s\n", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    fmt.Println("Successfully proxied request")
}

func main() {
    http.HandleFunc("GET /v2/namespaces/pegi3s/repositories/", handleRequest)
    fmt.Println("Proxy server listening on", port)
    err := http.ListenAndServe(port, nil)
    if err != nil {
        fmt.Println("Error:", err)
    }
}
