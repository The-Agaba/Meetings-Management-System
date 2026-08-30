package tz.go.bukobamc.meetings.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.UserRepository;
import tz.go.bukobamc.meetings.security.PasswordService;

@Configuration
public class DataInitializer {
    @Bean
    CommandLineRunner seed(UserRepository repo, PasswordService passwords,
                           @Value("${bmc.admin-email}") String email,
                           @Value("${bmc.admin-password}") String password,
                           @Value("${bmc.default-whatsapp-sender}") String phone) {
        return args -> {
            User user = repo.findByEmail(email).orElseGet(User::new);
            user.email = email;
            user.passwordHash = passwords.hash(password);
            user.name = "System Administrator";
            user.role = "admin";
            user.phone = phone;
            user.status = "active";
            user.active = true;
            user.emailVerified = true;
            user.phoneVerified = true;
            repo.save(user);
        };
    }
}
