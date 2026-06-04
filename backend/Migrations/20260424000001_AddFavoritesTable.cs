using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Crowdlens_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddFavoritesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Favorites"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Favorites"" PRIMARY KEY AUTOINCREMENT,
                    ""UserId"" TEXT NOT NULL,
                    ""LocationId"" INTEGER NOT NULL,
                    ""AddedAt"" TEXT NOT NULL,
                    ""AlertThreshold"" TEXT NOT NULL DEFAULT 'Low',
                    CONSTRAINT ""FK_Favorites_Locations_LocationId""
                        FOREIGN KEY (""LocationId"") REFERENCES ""Locations"" (""Id"") ON DELETE CASCADE
                );
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_Favorites_LocationId""
                ON ""Favorites"" (""LocationId"");
            ");

            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Favorites_UserId_LocationId""
                ON ""Favorites"" (""UserId"", ""LocationId"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Favorites");
        }
    }
}
