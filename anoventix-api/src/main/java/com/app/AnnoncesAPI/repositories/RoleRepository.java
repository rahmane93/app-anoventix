package com.app.AnnoncesAPI.repositories;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.enums.TypeRole;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(TypeRole name);
}
