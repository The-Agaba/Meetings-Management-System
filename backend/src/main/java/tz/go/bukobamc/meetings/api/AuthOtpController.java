package tz.go.bukobamc.meetings.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.*;
import tz.go.bukobamc.meetings.repo.*;
import tz.go.bukobamc.meetings.security.SessionService;
import tz.go.bukobamc.meetings.service.NotificationService;
import java.nio.charset.StandardCharsets; import java.security.*; import java.util.*; import java.time.*;

@RestController @RequestMapping("/api/auth")
public class AuthOtpController {
 private final UserRepository users; private final OTPVerificationRepository otps; private final SessionService sessions; private final NotificationService notifications; private final boolean whatsappEnabled; private final String appEnv;
 public AuthOtpController(UserRepository u,OTPVerificationRepository o,SessionService s,NotificationService n,@Value("${bmc.whatsapp-enabled:false}")boolean w,@Value("${APP_ENV:development}")String env){users=u;otps=o;sessions=s;notifications=n;whatsappEnabled=w;appEnv=env;}
 private static String hash(String x){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(x.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private String issue(User u,String channel){String code=String.format("%06d",new SecureRandom().nextInt(1_000_000));OTPVerification v=otps.findTopByUserIdAndChannelAndUsedFalseOrderByIdDesc(u.id,channel).orElseGet(OTPVerification::new);v.user=u;v.channel=channel;v.codeHash=hash(code);v.expiresAt=OffsetDateTime.now().plusMinutes(10);v.attemptCount=0;v.used=false;v.resendCount++;v.lastSentAt=OffsetDateTime.now();otps.save(v);String text="Your BMC Meeting System sign-in OTP is "+code+". It expires in 10 minutes.";if("email".equals(channel)){System.out.println("[DEV OTP] email="+u.email+" code="+code);notifications.otpEmail(u.email,code);}else if(u.phone!=null&&!u.phone.isBlank())notifications.whatsapp(u.phone,text);return code;}
 public record LoginStart(String email,String password){} public record LoginVerify(String email,String email_code,String whatsapp_code){}
 @GetMapping("/config") public Object config(){return Map.of("whatsapp_enabled",whatsappEnabled);}
 @PostMapping("/login/start") public Object start(@RequestBody LoginStart x){User u=users.findByEmail(x.email().trim().toLowerCase()).filter(a->hash(x.password()).equals(a.passwordHash)&&a.active&&"active".equals(a.status)).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid email, password, or unverified account"));String emailCode=issue(u,"email");String phoneCode=(whatsappEnabled&&u.phone!=null&&!u.phone.isBlank())?issue(u,"phone"):"";Map<String,Object> result=new HashMap<>();result.put("status","otp_required");result.put("whatsapp_enabled",whatsappEnabled);result.put("message",whatsappEnabled?"OTP sent to email and WhatsApp":"OTP sent to email");if("development".equalsIgnoreCase(appEnv)){result.put("development_email_otp",emailCode);if(whatsappEnabled&&u.phone!=null&&!u.phone.isBlank())result.put("development_whatsapp_otp",phoneCode);}return result;}
 @PostMapping("/login/verify") public Object verify(@RequestBody LoginVerify x){User u=users.findByEmail(x.email().trim().toLowerCase()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid account"));check(u,"email",x.email_code());if(whatsappEnabled)check(u,"phone",x.whatsapp_code());return Map.of("access_token",sessions.create(u),"user",Map.of("name",u.name,"role",u.role,"email",u.email));}
 private void check(User u,String channel,String code){OTPVerification v=otps.findTopByUserIdAndChannelAndUsedFalseOrderByIdDesc(u.id,channel).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"No active "+channel+" OTP"));if(code==null||v.expiresAt.isBefore(OffsetDateTime.now())||!hash(code).equals(v.codeHash))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid or expired "+channel+" OTP");v.used=true;otps.save(v);}
}
