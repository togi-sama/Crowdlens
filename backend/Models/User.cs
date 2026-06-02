using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;


namespace Crowdlens_backend.Models
{
    public class User : IdentityUser // Inherit from IdentityUser
    {
        public string FullName { get; set; } = "";
        public string Address { get; set; } = "";
        public DateTime BirthDate { get; set; }
        public string SelfDescription { get; set; } = "";
    }
}