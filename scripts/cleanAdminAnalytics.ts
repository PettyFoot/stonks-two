import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_USER_ID = 'cmetebqgb0000uajo7mvvgowi';

async function cleanAdminAnalytics() {
  try {
    console.log(`Cleaning analytics data for admin user: ${ADMIN_USER_ID}`);

    // Delete from analytics_sessions
    const deletedSessions = await prisma.analyticsSession.deleteMany({
      where: {
        userId: ADMIN_USER_ID,
      },
    });
    console.log(`✓ Deleted ${deletedSessions.count} records from analytics_sessions`);

    // Delete from analytics_page_views
    const deletedAnalyticsPageViews = await prisma.analyticsPageView.deleteMany({
      where: {
        userId: ADMIN_USER_ID,
      },
    });
    console.log(`✓ Deleted ${deletedAnalyticsPageViews.count} records from analytics_page_views`);

    // Delete from page_views
    const deletedPageViews = await prisma.pageView.deleteMany({
      where: {
        userId: ADMIN_USER_ID,
      },
    });
    console.log(`✓ Deleted ${deletedPageViews.count} records from page_views`);

    console.log('\n✓ Successfully cleaned all analytics data for admin user');

  } catch (error) {
    console.error('Error cleaning analytics data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAdminAnalytics();
