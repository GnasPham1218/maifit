package dev.gnaspham1218.maifit.backend.profile.repository;

import dev.gnaspham1218.maifit.backend.profile.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, Long> {
}
