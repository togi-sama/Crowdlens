using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Crowdlens_backend.Models;

namespace CrowdLens.Data;


public class CrowdLensDbContext : IdentityDbContext<User>
{
    public CrowdLensDbContext(DbContextOptions<CrowdLensDbContext> options) 
        : base(options) { }

    public DbSet<Report> Reports { get; set; } // why is there a need to do this? what does this do? I read that DbSet<Area> recognizes the model Area into a schema or table?
    public DbSet<Location> Locations { get; set; }
    public DbSet<ForecastRecord> ForecastRecords { get; set; }
    public DbSet<Favorite> Favorites { get; set; }
}