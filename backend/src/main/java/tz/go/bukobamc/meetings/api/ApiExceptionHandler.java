package tz.go.bukobamc.meetings.api;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,Object>> known(ResponseStatusException ex) {
        String message = ex.getReason() == null ? friendly(ex.getStatusCode()) : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message, "message", message, "status", ex.getStatusCode().value()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String,Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Validation failed",
                "message", errors,
                "status", HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<Map<String,Object>> handleConstraintViolationException(ConstraintViolationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Validation failed",
                "message", ex.getMessage(),
                "status", HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<Map<String,Object>> handleMissingParams(MissingServletRequestParameterException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Missing parameter",
                "message", ex.getParameterName() + " parameter is missing",
                "status", HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<Map<String,Object>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(Map.of(
                "error", "Method not allowed",
                "message", "Request method '" + ex.getMethod() + "' is not supported",
                "status", HttpStatus.METHOD_NOT_ALLOWED.value()));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<Map<String,Object>> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(Map.of(
                "error", "Unsupported media type",
                "message", "Media type is not supported",
                "status", HttpStatus.UNSUPPORTED_MEDIA_TYPE.value()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String,Object>> handleMessageNotReadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Malformed request",
                "message", "Required request body is missing or unreadable",
                "status", HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String,Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Invalid argument",
                "message", ex.getMessage() != null ? ex.getMessage() : "Invalid argument provided",
                "status", HttpStatus.BAD_REQUEST.value()));
    }
    
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String,Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Invalid state",
                "message", ex.getMessage() != null ? ex.getMessage() : "Application is in an invalid state for this request",
                "status", HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<Map<String,Object>> handleNoSuchElement(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "Not found",
                "message", ex.getMessage() != null ? ex.getMessage() : "The requested resource could not be found",
                "status", HttpStatus.NOT_FOUND.value()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String,Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Data integrity violation",
                "message", "The action conflicts with existing data (e.g., duplicate entry)",
                "status", HttpStatus.CONFLICT.value()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String,Object>> unexpected(Exception ex) {
        log.error("Unhandled API error: {}", ex.getMessage(), ex);
        
        // If it's a Spring Security AccessDeniedException, it'll bubble up here unless we handle it specifically.
        // It's in org.springframework.security.access.AccessDeniedException, but we might not have it imported if spring-security isn't fully set up for it in web context, though we see spring-security-crypto in pom.xml. Let's catch by class name in general or just handle it if it matches.
        if (ex.getClass().getName().contains("AccessDeniedException")) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", "Access denied",
                "message", "You do not have permission to access this resource.",
                "status", HttpStatus.FORBIDDEN.value()));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "error", "Internal server error",
            "message", "The request could not be completed due to an unexpected error. Please contact the system administrator.",
            "status", HttpStatus.INTERNAL_SERVER_ERROR.value()));
    }

    private String friendly(HttpStatusCode status) {
        if (status.value() == 401) return "Your session has expired. Please sign in again.";
        if (status.value() == 403) return "You do not have permission to perform this action.";
        if (status.value() == 404) return "The requested record could not be found.";
        if (status.value() == 409) return "This action conflicts with the current record.";
        if (status.value() == 422) return "Please check the information entered and try again.";
        return "The request could not be completed. Please try again.";
    }
}
