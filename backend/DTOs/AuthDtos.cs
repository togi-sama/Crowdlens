using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Crowdlens_backend.DTOs
{
    public class RegisterDto
    {
        public string FullName { get; set; } = "";
        public string Address { get; set; } = "";
        public DateTime BirthDate { get; set; }
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";

        public string Role { get; set; } = "User"; // User or Admin
    }

    public class LoginDto
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    // NEW: The response sent back to React after Login
    public class AuthResponseDto
    {
        public string Token { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";
    }
}