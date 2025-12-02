package com.xlwl.AiMian.ui.jobs

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Public
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextAlign
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xlwl.AiMian.data.repository.JobRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompanyDetailRoute(
    repository: JobRepository,
    companyId: String,
    onBack: () -> Unit,
    onRoleClick: (String) -> Unit
) {
    val viewModel: CompanyDetailViewModel = viewModel(
        factory = CompanyDetailViewModel.provideFactory(repository, companyId)
    )
    val uiState by viewModel.uiState.collectAsState()
    val profile = uiState.profile

    when {
        uiState.isLoading && profile == null -> CompanyDetailLoadingState()
        uiState.error != null && profile == null -> CompanyDetailErrorState(
            message = uiState.error ?: "加载失败",
            onRetry = { viewModel.retry() },
            onBack = onBack
        )
        profile != null -> CompanyDetailScreen(
            profile = profile,
            onBack = onBack,
            onRoleClick = onRoleClick
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CompanyDetailScreen(
    profile: CompanyProfile,
    onBack: () -> Unit,
    onRoleClick: (String) -> Unit
) {
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior(rememberTopAppBarState())
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = profile.name,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                        )
                        Text(
                            text = profile.tagline,
                            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280)),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Outlined.ArrowBack, contentDescription = "返回")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Color(0xFF111827),
                    navigationIconContentColor = Color(0xFF111827)
                ),
                scrollBehavior = scrollBehavior
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF6F7FB))
                .padding(innerPadding),
            contentPadding = PaddingValues(bottom = 96.dp)
        ) {
            item { CompanyHero(profile) }
            item { SectionSpacing(height = 16.dp) }
            item { SectionTitle(title = "公司介绍") }
            item { SectionDescription(text = profile.description) }
            item { SectionSpacing(height = 20.dp) }
            item { SectionTitle(title = "企业亮点") }
            item { CompanyHighlights(highlights = profile.highlights) }
            item { SectionSpacing(height = 20.dp) }
            item { SectionTitle(title = "企业文化") }
            item { CompanyCulture(culture = profile.culture) }
            if (profile.openRoles.isNotEmpty()) {
                item { SectionSpacing(height = 20.dp) }
                item { SectionTitle(title = "热门开放岗位") }
                items(profile.openRoles, key = { it.id }) { job ->
                    CompanyOpenRoleCard(listing = job, onClick = { onRoleClick(job.id) })
                }
            }
            item { SectionSpacing(height = 20.dp) }
            item { CompanyFooter(profile) }
        }
    }
}

@Composable
private fun CompanyHero(profile: CompanyProfile) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        shape = RoundedCornerShape(26.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .background(brush = Brush.linearGradient(profile.gradient))
                .padding(24.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = Color.White.copy(alpha = 0.18f)
            ) {
                Text(
                    text = profile.name.take(2),
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                )
            }

            Spacer(modifier = Modifier.height(18.dp))

            Text(
                text = profile.name,
                style = MaterialTheme.typography.headlineSmall.copy(
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = profile.tagline,
                style = MaterialTheme.typography.bodyMedium.copy(color = Color.White.copy(alpha = 0.9f))
            )

            Spacer(modifier = Modifier.height(18.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = Color.White.copy(alpha = 0.9f))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = profile.location,
                    style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(alpha = 0.92f))
                )
            }

            Spacer(modifier = Modifier.height(18.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                profile.stats.forEach { stat ->
                    CompanyStatPill(stat = stat)
                }
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.CompanyStatPill(stat: CompanyStat) {
    Surface(
        modifier = Modifier.weight(1f),
        color = Color.White.copy(alpha = 0.18f),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = stat.value,
                style = MaterialTheme.typography.titleMedium.copy(
                    color = stat.accent,
                    fontWeight = FontWeight.Bold
                )
            )
            Text(
                text = stat.label,
                style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(alpha = 0.86f))
            )
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        style = MaterialTheme.typography.titleMedium.copy(
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF1F2937)
        )
    )
}

@Composable
private fun SectionDescription(text: String) {
    Text(
        text = text,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF4B5563))
    )
}

@Composable
private fun CompanyHighlights(highlights: List<String>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
    ) {
        highlights.forEach { highlight ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                color = Color.White,
                shape = RoundedCornerShape(18.dp),
                tonalElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 18.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.StarOutline,
                        contentDescription = null,
                        tint = Color(0xFFFFAA4C)
                    )
                    Text(
                        text = highlight,
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF374151))
                    )
                }
            }
        }
    }
}

@Composable
private fun CompanyCulture(culture: List<String>) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        shape = RoundedCornerShape(22.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            culture.forEach { item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF3B82F6).copy(alpha = 0.12f)
                    ) {
                        Box(modifier = Modifier.padding(8.dp)) {
                            Box(
                                modifier = Modifier
                                    .height(6.dp)
                                    .fillMaxWidth(0.4f)
                                    .background(Color(0xFF3B82F6), shape = CircleShape)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = item,
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF1F2937))
                    )
                }
            }
        }
    }
}

@Composable
private fun CompanyOpenRoleCard(listing: JobListing, onClick: () -> Unit) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        onClick = onClick,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier
                        .size(46.dp),
                    color = listing.badgeColor.copy(alpha = 0.16f),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = listing.company.take(1),
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = listing.badgeColor,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = listing.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF111827)
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${listing.company} · ${listing.location}",
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280))
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RoleChip(icon = Icons.Outlined.Public, text = listing.salary, tint = listing.badgeColor)
                RoleChip(icon = Icons.Outlined.StarOutline, text = listing.experience, tint = Color(0xFF6366F1))
            }

            Spacer(modifier = Modifier.height(14.dp))

            RoleTags(tags = listing.tags)

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = listing.posted,
                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF9CA3AF))
            )
        }
    }
}

@Composable
private fun RoleChip(icon: ImageVector, text: String, tint: Color) {
    Surface(
        color = tint.copy(alpha = 0.12f),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = tint)
            Text(text = text, style = MaterialTheme.typography.bodySmall.copy(color = tint))
        }
    }
}

@Composable
private fun RoleTags(tags: List<String>) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        tags.take(3).forEach { tag ->
            Surface(
                color = Color(0xFFF2F4F7),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    text = "# $tag",
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6366F1))
                )
            }
        }
    }
}

@Composable
private fun CompanyFooter(profile: CompanyProfile) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "了解更多",
            style = MaterialTheme.typography.titleSmall.copy(
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF1F2937)
            )
        )
        Surface(
            color = Color.White,
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(Icons.Outlined.Public, contentDescription = null, tint = Color(0xFF2563EB))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = profile.website,
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF1D4ED8))
                    )
                    Text(
                        text = profile.location,
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280))
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionSpacing(height: androidx.compose.ui.unit.Dp) {
    Spacer(modifier = Modifier.height(height))
}

@Composable
private fun CompanyDetailLoadingState() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF6F7FB))
    ) {
        CircularProgressIndicator(
            modifier = Modifier.align(Alignment.Center),
            color = Color(0xFFFF8C42)
        )
    }
}

@Composable
private fun CompanyDetailErrorState(message: String, onRetry: () -> Unit, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF6F7FB))
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "加载企业信息失败",
            style = MaterialTheme.typography.titleMedium.copy(color = Color(0xFF1F2937), fontWeight = FontWeight.SemiBold)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF6B7280)),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(20.dp))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF8C42)),
            shape = RoundedCornerShape(20.dp)
        ) {
            Text(text = "重新加载", style = MaterialTheme.typography.bodyMedium.copy(color = Color.White))
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onBack,
            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, Color(0xFFFF8C42))
        ) {
            Text(text = "返回岗位", style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFFFF8C42)))
        }
    }
}
