package tz.go.bukobamc.meetings.api;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,Object>> known(ResponseStatusException ex) {
        String message = ex.getReason() == null ? friendly(ex.getStatusCode()) : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message, "message", message, "status", ex.getStatusCode().value()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String,Object>> unexpected(Exception ex) {
        log.error("Unhandled API error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "error", "The request could not be completed. Please try again or contact the system administrator.",
            "message", "The request could not be completed. Please try again or contact the system administrator.",
            "status", 500));
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
