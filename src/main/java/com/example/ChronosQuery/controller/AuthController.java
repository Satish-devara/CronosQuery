package com.example.ChronosQuery.controller;

import com.example.ChronosQuery.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestParam String username) {
        // In a real app, validate database credentials here first.
        String token = jwtUtil.generateToken(username);
        return ResponseEntity.ok(token);
    }
}