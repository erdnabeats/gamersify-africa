import { prisma } from './prisma';
import { db } from './adapter';

async function main() {
  console.log('Testing Gamersify database adapter...\n');

  const teams = await db.list('codm_teams');

  console.log(`Teams found: ${teams.length}`);

  if (teams.length > 0) {
    console.log('First team:');
    console.log({
      id: teams[0].id,
      name: teams[0].name,
      tierName: teams[0].tierName,
    });

    const team = await db.get('codm_teams', teams[0].id);

    console.log('\nGet team result:');
    console.log(team);
  }

  const tournaments = await db.list('codm_tournaments');

  console.log(`\nTournaments found: ${tournaments.length}`);

  const matches = await db.list('codm_matches');

  console.log(`Matches found: ${matches.length}`);

  console.log('\nAdapter test successful.');
}

main()
  .catch((error) => {
    console.error('\nAdapter test failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });